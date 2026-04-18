/* ============================================================
   SVG Wiring Editor; Layers Feature
   Layers tree panel (side panel) + Timeline thumbnail filmstrip
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Layers tree (side panel); unchanged behaviour ────────

    showLayers() {
        this.$sidePanel.addClass('open');
        this.buildLayersTree();
        this._initLayerObserver();
    },

    _initLayerObserver() {
        if (!this._layerObserver) {
            this._layerObserver = new MutationObserver(() => {
                clearTimeout(this._layerObserverTimer);
                this._layerObserverTimer = setTimeout(() => this.buildLayersTree(), 150);
            });
        }
        // Always re-observe: _contentRoot may be a new element after canvas switch
        this._layerObserver.disconnect();
        const root = this._contentRoot;
        if (!root) return;
        this._layerObserver.observe(root, {
            childList: true,
            subtree:   true,
            attributes: true,
            attributeFilter: ['id', 'data-symbol', 'data-geo-class'],
        });
    },

    buildLayersTree() {
        this._initLayerObserver();   // re-attach in case _contentRoot changed
        const $panel = $('#layersPanel');
        $panel.empty();

        // Walk _contentRoot (inside _cameraRotGroup), not $svgDisplay root —
        // structural elements (_cameraRotGroup, _gridLayer, defs) never appear here.
        const contentRoot  = this._contentRoot;
        const rootElements = contentRoot
            ? Array.from(contentRoot.children)
                .filter(el => !el.classList.contains('selection-handle-group'))
            : [];

        if (rootElements.length === 0) {
            $panel.html('<p style="color:rgba(255,255,255,0.4);font-size:11px;padding:8px;">Load an SVG to see layers.</p>');
            return;
        }

        // ── Topology-aware mode: use live (connected) records only ────
        const liveWires      = (this.wires      || []).filter(w => w.element?.isConnected);
        const liveComponents = (this.components || []).filter(c => c.element?.isConnected);
        const liveConnectors = (this.connectors || []).filter(c => c.element?.isConnected);
        const hasTopology    = liveWires.length > 0 || liveComponents.length > 0 || liveConnectors.length > 0;

        if (hasTopology) {
            this._buildTopologyLayerTree($panel, liveWires, liveComponents, liveConnectors);
            return;
        }

        // ── Fallback: flat DOM walk (blank canvas / pre-analysis) ──
        this._buildFlatLayerTree($panel, rootElements);
    },

    // ── Topology layer groups (post-analysis) ─────────────────
    _buildTopologyLayerTree($panel, liveWires, liveComponents, liveConnectors) {
        // Build semantic buckets from graph data
        const groups = {
            wires:      { label: 'Wires',      icon: 'material-symbols:route-outline',       items: [], color: '#4facfe' },
            connectors: { label: 'Connectors', icon: 'material-symbols:radio-button-checked', items: [], color: '#a78bfa' },
            modules:    { label: 'Modules',    icon: 'material-symbols:memory-outline',       items: [], color: '#34d399' },
            junctions:  { label: 'Junctions',  icon: 'material-symbols:hub-outline',          items: [], color: '#fbbf24' },
            other:      { label: 'Other',      icon: 'material-symbols:layers-outline',       items: [], color: '#94a3b8' },
        };

        // Populate wires bucket (live records only)
        liveWires.forEach(w => {
            groups.wires.items.push({
                el:    w.element,
                id:    w.id,
                label: `${w.id}  ${w.color !== 'black' ? `· ${w.color}` : ''}  ${w.length ? `· ${w.length.toFixed(0)}px` : ''}`,
                extra: w.linearity != null ? `lin: ${w.linearity.toFixed(2)}` : '',
            });
        });

        // Populate connectors bucket (live pin-points)
        liveConnectors.forEach(c => {
            groups.connectors.items.push({
                el: c.element, id: c.id,
                label: `${c.id}  · pin`,
                extra: '',
            });
        });

        // Populate modules: bypass GeoEngine — query live DOM for domain symbols directly
        const trackedByGeo = new Set();
        this._contentRoot.querySelectorAll('[data-symbol]').forEach((el, i) => {
            if (!el.isConnected) return;
            const symType = el.getAttribute('data-symbol');
            const domId   = el.id || `sym_${symType}_${i}`;
            groups.modules.items.push({
                el, id: domId,
                label: `${domId}  · ${symType}`,
                extra: '',
            });
            trackedByGeo.add(el);
        });

        // Remaining GeoEngine components (live, non-domain-symbol shapes)
        liveComponents.forEach(c => {
            if (trackedByGeo.has(c.element)) return;
            const label = `${c.id}  · ${c.type}`;
            const extra = c.circularity != null ? `C: ${c.circularity.toFixed(2)}` : '';
            const item  = { el: c.element, id: c.id, label, extra };
            if (c.type === 'connector')
                groups.connectors.items.push(item);
            else if (c.type === 'module' || c.type === 'resistor' || c.type === 'capacitor' ||
                     c.type === 'relay'  || c.type === 'switch')
                groups.modules.items.push(item);
            else
                groups.other.items.push(item);
        });

        // Populate junction bucket from graph
        if (this.graph?.nodes) {
            this.graph.nodes.forEach(node => {
                if (node.kind === 'junction') {
                    groups.junctions.items.push({
                        el:    null,
                        id:    node.id,
                        label: `${node.id}  · deg ${node.degree}`,
                        extra: `(${node.x.toFixed(1)}, ${node.y.toFixed(1)})`,
                    });
                }
            });
        }

        // Render each group
        Object.values(groups).forEach(group => {
            if (!group.items.length) return;   // skip empty groups

            const groupId = `lg_${group.label.toLowerCase()}`;
            const $group  = $(`
                <div class="layer-group" id="${groupId}">
                    <div class="layer-group-header" data-group="${groupId}">
                        <span class="layer-group-arrow">▾</span>
                        <iconify-icon icon="${group.icon}" style="font-size:13px;color:${group.color};"></iconify-icon>
                        <span class="layer-group-label" style="color:${group.color};">${group.label}</span>
                        <span class="layer-group-count">${group.items.length}</span>
                        <button class="layer-group-vis" title="Toggle group visibility"
                                style="margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.5);font-size:11px;"
                                data-vis-group="${groupId}">
                            <iconify-icon icon="material-symbols:visibility-outline" style="font-size:12px;"></iconify-icon>
                        </button>
                    </div>
                    <div class="layer-group-body" id="${groupId}_body"></div>
                </div>
            `);

            // Group collapse/expand
            $group.find('.layer-group-header').on('click', e => {
                if ($(e.target).closest('.layer-group-vis').length) return;
                const $arrow = $group.find('.layer-group-arrow');
                const $body  = $group.find('.layer-group-body');
                const collapsed = $body.hasClass('collapsed');
                $body.toggleClass('collapsed', !collapsed);
                $arrow.text(collapsed ? '▾' : '▸');
            });

            // Group visibility toggle — hides all DOM elements in this bucket
            $group.find('.layer-group-vis').on('click', e => {
                e.stopPropagation();
                const $body   = $group.find('.layer-group-body');
                const hidden  = $group.data('hidden');
                group.items.forEach(item => {
                    if (item.el) $(item.el).css('display', hidden ? '' : 'none');
                });
                $group.data('hidden', !hidden).css('opacity', hidden ? 1 : 0.45);
            });

            // Render individual items inside the group
            const $body = $group.find(`#${groupId}_body`);
            group.items.forEach(item => {
                const $item = $(`
                    <div class="layer-item topo-item" data-element-id="${item.id}"
                         title="${item.label}  ${item.extra}">
                        <span class="layer-dot" style="background:${group.color};"></span>
                        <span class="layer-name">${item.label}</span>
                        ${item.extra ? `<span class="layer-extra">${item.extra}</span>` : ''}
                        <button class="layer-toggle layer-vis-btn" title="Toggle visibility"
                                style="margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);">
                            <iconify-icon icon="material-symbols:visibility-outline" style="font-size:11px;"></iconify-icon>
                        </button>
                    </div>
                `);

                // Click → select element in canvas
                $item.on('click', e => {
                    if ($(e.target).closest('.layer-vis-btn').length) return;
                    if (item.el) {
                        this.deselectAll?.();
                        this.selectEl?.(item.el);
                        // Animate scroll to element
                        item.el.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                    }
                    $('.topo-item').removeClass('active');
                    $item.addClass('active');
                });

                // Hover preview
                if (item.el) {
                    $item.on('mouseenter', () => $(item.el).addClass('layer-hover-highlight'))
                         .on('mouseleave', () => $(item.el).removeClass('layer-hover-highlight'));
                }

                // Per-item visibility toggle
                $item.find('.layer-vis-btn').on('click', e => {
                    e.stopPropagation();
                    if (!item.el) return;
                    const hidden = $(item.el).css('display') === 'none';
                    $(item.el).css('display', hidden ? '' : 'none');
                    $item.css('opacity', hidden ? 1 : 0.4);
                });

                $body.append($item);
            });

            $panel.append($group);
        });

        // Topology stats footer
        const nodeCount = this.graph?.nodes?.size || 0;
        const edgeCount = this.graph?.edges?.size || 0;
        $panel.append(`
            <div style="margin-top:10px;padding:6px 8px;border-top:1px solid rgba(255,255,255,0.07);
                        font-size:10px;color:rgba(255,255,255,0.3);line-height:1.7;">
                <iconify-icon icon="material-symbols:schema-outline" style="font-size:11px;"></iconify-icon>
                Graph: ${nodeCount} nodes · ${edgeCount} edges ·
                ${this._quadTree ? '<span style="color:#34d399;">QuadTree active</span>' : 'QuadTree inactive'}
            </div>
        `);
    },

    // ── Flat DOM walk fallback (blank canvas / pre-analysis) ──
    _buildFlatLayerTree($panel, rootElements) {
        const build = (elements, depth) => {
            elements.forEach((el, idx) => {
                const $el        = $(el);
                const tag        = el.tagName.toLowerCase();
                const id         = $el.attr('id') || `${tag}_${idx}`;
                const isGroup    = tag === 'g';
                const childCount = isGroup ? el.children.length : 0;
                const icon       = isGroup ? (childCount > 0 ? '▾' : '◂') : '●';

                const $item = $(`
                    <div class="layer-item" data-element-id="${id}" style="margin-left:${depth * 10}px;">
                        <button class="layer-toggle" data-toggle="${id}">${icon}</button>
                        <button class="layer-toggle" data-visibility="${id}" title="Toggle visibility">
                            <iconify-icon icon="material-symbols:visibility-outline" style="font-size:12px;"></iconify-icon>
                        </button>
                        <span class="layer-name" title="Double-click to rename">${tag}${id ? `#${id}` : ''}</span>
                    </div>
                `);

                $item.on('click', () => this.selectLayer(el, $item));
                $item.on('mouseenter', () => { if (!$item.hasClass('active')) $(el).addClass('layer-hover-highlight'); })
                     .on('mouseleave',  () => $(el).removeClass('layer-hover-highlight'));

                $item.find(`[data-toggle="${id}"]`).on('click', e => {
                    e.stopPropagation();
                    $item.toggleClass('collapsed');
                    $item.find(`[data-toggle="${id}"]`).text($item.hasClass('collapsed') ? '▸' : '▾');
                });

                $item.find(`[data-visibility="${id}"]`).on('click', e => {
                    e.stopPropagation();
                    const hidden = $(el).css('display') === 'none';
                    $(el).css('display', hidden ? '' : 'none');
                    $item.css('opacity', hidden ? 1 : 0.4);
                });

                $item.find('.layer-name').on('dblclick', e => {
                    e.stopPropagation();
                    this.startLayerRename(el, $item, $(e.currentTarget));
                });

                $panel.append($item);
                if (isGroup && childCount > 0) build(Array.from(el.children), depth + 1);
            });
        };
        build(rootElements, 0);
    },

    selectLayer(element, $layerItem) {
        $('.layer-item.active').removeClass('active');
        $layerItem.addClass('active');
        $(element).removeClass('layer-hover-highlight');
        this.clearSelection();
        this.selectedElements = [element];
        $(element).addClass('component-highlight');
        this.showToast(`Selected: ${element.tagName}#${$(element).attr('id') || 'unnamed'}`, 'success');
    },

    startLayerRename(svgEl, $item, $nameSpan) {
        if ($item.find('.layer-name-input').length) return;

        const tag = svgEl.tagName.toLowerCase();
        const currentId = $(svgEl).attr('id') || '';
        const $input = $('<input type="text" class="layer-name-input">')
            .val(currentId)
            .attr('placeholder', 'layer-name');

        $nameSpan.replaceWith($input);
        $input[0].focus();
        $input[0].select();

        const commit = () => {
            const raw = $input.val().trim();
            const newId = raw
                ? raw.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-:.]/g, '')
                : currentId;

            if (newId) svgEl.setAttribute('id', newId);
            $item.attr('data-element-id', newId || currentId);

            const label = `${tag}${newId ? `#${newId}` : ''}`;
            const $newSpan = $(`<span class="layer-name" title="Double-click to rename">${label}</span>`);
            $input.replaceWith($newSpan);

            $newSpan.on('dblclick', (e) => {
                e.stopPropagation();
                this.startLayerRename(svgEl, $item, $newSpan);
            });
        };

        $input.on('blur', commit);
        $input.on('keydown', (e) => {
            if (e.key === 'Enter')  { $input.trigger('blur'); }
            if (e.key === 'Escape') { $input.replaceWith($nameSpan); }
        });
    },

    // ── Timeline thumbnail filmstrip ──────────────────────────

    showTimeline() {
        $('#timelinePanel').toggleClass('open');
        if ($('#timelinePanel').hasClass('open')) this.buildTimeline();
    },

    buildTimeline() {
        const $tracks = $('#timelineTracks');
        $tracks.empty();

        this.displays.forEach((display, idx) => {
            const isActive = idx === this.activeDisplayIdx;

            // Build SVG thumbnail from stored content
            let thumbHtml = '<iconify-icon icon="material-symbols:description-outline" style="font-size:22px;opacity:0.4;"></iconify-icon>';
            try {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(display.svgContent, 'image/svg+xml');
                const svgEl  = svgDoc.querySelector('svg');
                if (svgEl) {
                    const vb = svgEl.getAttribute('viewBox') || '0 0 400 300';
                    thumbHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${svgEl.innerHTML}</svg>`;
                }
            } catch (_) { /* fallback icon */ }

            const shortName = display.name.length > 10
                ? display.name.slice(0, 9) + '…'
                : display.name;

            const $card = $(`
                <div class="timeline-card${isActive ? ' active' : ''}" data-idx="${idx}" title="${display.name}">
                    <div class="timeline-card-preview">${thumbHtml}</div>
                    <div class="timeline-card-name">${shortName}</div>
                    <button class="timeline-card-del" title="Remove">✕</button>
                </div>
            `);

            $card.on('click', e => {
                if (!$(e.target).closest('.timeline-card-del').length) {
                    this.switchDisplay(idx);
                }
            });

            $card.find('.timeline-card-del').on('click', e => {
                e.stopPropagation();
                this.removeDisplay(idx);
            });

            $tracks.append($card);
        });

        // Add (+) card at the end
        const $addCard = $(`
            <div class="timeline-card timeline-add-card" title="Add diagram">
                <div class="timeline-card-preview">
                    <iconify-icon icon="material-symbols:add" style="font-size:24px;opacity:0.5;"></iconify-icon>
                </div>
                <div class="timeline-card-name">Add</div>
            </div>
        `);
        $addCard.on('click', () => $('#hiddenFileInput').click());
        $tracks.append($addCard);
    },

    removeDisplay(idx) {
        this.displays.splice(idx, 1);

        if (!this.displays.length) {
            this.$svgDisplay.empty();
            this.wires = [];
            this.components = [];
            this.activeDisplayIdx = -1;
            this.buildTimeline();
            return;
        }

        this.switchDisplay(Math.min(idx, this.displays.length - 1));
    },
});
