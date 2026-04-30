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
        // Bind Alt+M for merge once per editor instance
        if (!this._layerKeysBound) {
            this._layerKeysBound = true;
            $(document).on('keydown.layerKeys', (e) => {
                if (e.altKey && e.key.toLowerCase() === 'm') {
                    e.preventDefault();
                    this._mergeSelectedLayers();
                }
            });
        }
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
            subtree: true,
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
        const contentRoot = this._contentRoot;
        const rootElements = contentRoot
            ? Array.from(contentRoot.children)
                .filter(el => !el.classList.contains('selection-handle-group')
                    && el.id !== '_gridLayer')
            : [];

        if (rootElements.length === 0) {
            $panel.html('<p style="color:rgba(255,255,255,0.4);font-size:11px;padding:8px;">Load an SVG to see layers.</p>');
            return;
        }

        // ── Topology-aware mode: use live (connected) records only ────
        const liveWires = (this.wires || []).filter(w => w.element?.isConnected);
        const liveComponents = (this.components || []).filter(c => c.element?.isConnected);
        const liveConnectors = (this.connectors || []).filter(c => c.element?.isConnected);
        const hasTopology = liveWires.length > 0 || liveComponents.length > 0 || liveConnectors.length > 0;

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
            wires: { label: 'Wires', icon: 'material-symbols:route-outline', items: [], color: '#4facfe' },
            connectors: { label: 'Connectors', icon: 'material-symbols:radio-button-checked', items: [], color: '#a78bfa' },
            modules: { label: 'Modules', icon: 'material-symbols:memory-outline', items: [], color: '#34d399' },
            components: { label: 'Components', icon: 'material-symbols:category-outline', items: [], color: '#94a3b8' },
            junctions: { label: 'Junctions', icon: 'material-symbols:hub-outline', items: [], color: '#fbbf24' },
        };

        // Populate wires bucket (live records only)
        liveWires.forEach(w => {
            const extraArr = [];
            if (w.color !== 'black') extraArr.push(w.color);
            if (w.length) extraArr.push(`${w.length.toFixed(0)}px`);
            if (w.linearity != null) extraArr.push(`lin: ${w.linearity.toFixed(2)}`);
            groups.wires.items.push({
                el: w.element, id: w.id, label: w.id,
                classType: 'wire',
                extra: extraArr.join(' · ')
            });
        });

        // Populate connectors bucket (live pin-points)
        liveConnectors.forEach(c => {
            groups.connectors.items.push({
                el: c.element, id: c.id, label: c.id,
                classType: 'connector',
                extra: 'pin',
            });
        });

        // Populate modules: bypass GeoEngine — query live DOM for domain symbols directly
        const trackedByGeo = new Set();
        this._contentRoot.querySelectorAll('[data-symbol]').forEach((el, i) => {
            if (!el.isConnected) return;
            const manualClass = el.getAttribute('data-geo-class');
            const symType = el.getAttribute('data-symbol');
            const domId   = el.id || `sym_${symType}_${i}`;
            const cls = manualClass || 'module';
            const item = {
                el, id: domId, label: domId,
                classType: cls,
                extra: symType,
            };
            
            if (cls === 'connector') groups.connectors.items.push(item);
            else if (cls === 'wire') groups.wires.items.push(item);
            else if (cls === 'junction') groups.junctions.items.push(item);
            else if (cls === 'component') groups.components.items.push(item);
            else groups.modules.items.push(item);
            
            trackedByGeo.add(el);
        });

        // Remaining GeoEngine components (live, non-domain-symbol shapes)
        liveComponents.forEach(c => {
            if (trackedByGeo.has(c.element)) return;
            const item = {
                el: c.element, id: c.id, label: c.id,
                classType: c.type,
                extra: c.circularity != null ? `C: ${c.circularity.toFixed(2)}` : ''
            };
            if (c.type === 'connector')
                groups.connectors.items.push(item);
            else if (c.type === 'module' || c.type === 'resistor' || c.type === 'capacitor' ||
                c.type === 'relay' || c.type === 'switch')
                groups.modules.items.push(item);
            else
                groups.components.items.push(item);
        });

        // Populate junction bucket from graph
        if (this.graph?.nodes) {
            this.graph.nodes.forEach(node => {
                if (node.kind === 'junction') {
                    groups.junctions.items.push({
                        el: null, id: node.id, label: node.id,
                        classType: 'junction',
                        extra: `deg ${node.degree} (${node.x.toFixed(1)}, ${node.y.toFixed(1)})`,
                    });
                }
            });
        }

        // Render each group
        Object.values(groups).forEach(group => {
            if (!group.items.length) return;   // skip empty groups

            const groupId = `lg_${group.label.toLowerCase()}`;
            const $group = $(`
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
                const $body = $group.find('.layer-group-body');
                const collapsed = $body.hasClass('collapsed');
                $body.toggleClass('collapsed', !collapsed);
                $arrow.text(collapsed ? '▾' : '▸');
            });

            // Group visibility toggle — hides all DOM elements in this bucket
            $group.find('.layer-group-vis').on('click', e => {
                e.stopPropagation();
                const $body = $group.find('.layer-group-body');
                const hidden = $group.data('hidden');
                group.items.forEach(item => {
                    if (item.el) $(item.el).css('display', hidden ? '' : 'none');
                });
                $group.data('hidden', !hidden).css('opacity', hidden ? 1 : 0.45);
            });

            // Render individual items inside the group
            const $body = $group.find(`#${groupId}_body`);
            group.items.forEach(item => {
                const isLocked = item.el ? item.el.dataset.locked === 'true' : false;
                const lockIcon = isLocked ? 'material-symbols:lock-outline' : 'material-symbols:lock-open-outline';
                const lockTitle = isLocked ? 'Unlock element' : 'Lock element';
                const canChangeClass = !!item.el && item.classType !== 'junction';

                // The dropdown HTML for overriding GeoEngine classes
                const classDropdown = canChangeClass ? `
                    <select class="geo-class-select" style="background:transparent;border:none;color:inherit;outline:none;font-size:11px;cursor:pointer;opacity:0.8;margin-right:6px;width:75px;">
                        <option value="module" ${item.classType === 'module' ? 'selected' : ''} style="background:#1e293b;">Module</option>
                        <option value="component" ${item.classType === 'component' ? 'selected' : ''} style="background:#1e293b;">Component</option>
                        <option value="wire" ${item.classType === 'wire' ? 'selected' : ''} style="background:#1e293b;">Wire</option>
                        <option value="connector" ${item.classType === 'connector' ? 'selected' : ''} style="background:#1e293b;">Connector</option>
                    </select>
                ` : `<span style="font-size:11px;opacity:0.5;margin-right:6px;width:75px;display:inline-block;">${item.classType || ''}</span>`;

                const $item = $(`
                    <div class="layer-item topo-item ${isLocked ? 'layer-item-locked' : ''}" data-element-id="${item.id}"
                         title="${item.label}  ${item.extra}">
                        <span class="layer-dot" style="background:${group.color};"></span>
                        ${classDropdown}
                        <span class="layer-name">${item.label}</span>
                        ${item.extra ? `<span class="layer-extra">${item.extra}</span>` : ''}

                        <div style="margin-left:auto; display:flex; gap:2px; align-items:center;">
                            ${item.el ? `
                            <button class="layer-toggle layer-lock-btn" title="${lockTitle}"
                                    style="background:none;border:none;cursor:pointer;color:${isLocked ? '#fbbf24' : 'rgba(255,255,255,0.3)'};">
                                <iconify-icon icon="${lockIcon}" style="font-size:12px;"></iconify-icon>
                            </button>
                            <button class="layer-toggle layer-vis-btn" title="Toggle visibility"
                                    style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.4);">
                                <iconify-icon icon="material-symbols:visibility-outline" style="font-size:12px;"></iconify-icon>
                            </button>
                            <button class="layer-toggle layer-del-btn" title="Delete layer"
                                    style="background:none;border:none;cursor:pointer;color:rgba(255,100,100,0.45);">
                                <iconify-icon icon="material-symbols:delete-outline-rounded" style="font-size:12px;"></iconify-icon>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `);

                // Class override dropdown change handler
                $item.find('.geo-class-select').on('change', function (e) {
                    e.stopPropagation();
                    if (!item.el) return;
                    const newClass = $(this).val();
                    item.el.setAttribute('data-geo-class', newClass);

                    // The mutation observer will catch the attribute change,
                    // but we also need to force GeoEngine to re-evaluate the graph immediately
                    // so the component physically moves to the new semantic bucket in the logic.
                    // (Assuming MobileSVGEditor._runGeometryPipeline exists and can be called)
                    if (typeof window.svgEditor?._runGeometryPipeline === 'function') {
                        window.svgEditor._runGeometryPipeline();
                    }
                });

                // Click → single select or shift+click to add to multi-selection
                $item.on('click', e => {
                    if ($(e.target).closest('.layer-vis-btn, .layer-lock-btn, .layer-del-btn, .geo-class-select').length) return;
                    if (isLocked) {
                        this.showToast('Element is locked — click the lock icon to unlock', 'error');
                        return;
                    }

                    if (e.shiftKey && item.el) {
                        if (!this._layerSelectedItems) this._layerSelectedItems = new Map();
                        if (this._layerSelectedItems.has(item.el)) {
                            this._layerSelectedItems.delete(item.el);
                            $item.removeClass('layer-selected active');
                        } else {
                            this._layerSelectedItems.set(item.el, $item);
                            $item.addClass('layer-selected active');
                            this.selectEl?.(item.el, true); // additive canvas select
                        }
                    } else {
                        this._clearLayerSelection();
                        if (item.el) {
                            this._layerSelectedItems.set(item.el, $item);
                            $item.addClass('layer-selected');
                            this.selectEl?.(item.el);
                            item.el.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
                        }
                        $('.topo-item').removeClass('active');
                        $item.addClass('active');
                    }
                });

                // Right-click → context menu
                $item.on('contextmenu', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!this._layerSelectedItems) this._layerSelectedItems = new Map();
                    // If this item isn't already in the selection, make it the sole selection
                    if (item.el && !this._layerSelectedItems.has(item.el)) {
                        this._clearLayerSelection();
                        this._layerSelectedItems.set(item.el, $item);
                        $item.addClass('layer-selected active');
                    }
                    this._showLayerContextMenu(e.clientX, e.clientY);
                });

                // Double click → rename layer
                $item.find('.layer-name').on('dblclick', e => {
                    e.stopPropagation();
                    if (isLocked) return;
                    if (!item.el) return;
                    this.startLayerRename(item.el, $item, $(e.currentTarget));
                });

                // Hover preview
                if (item.el) {
                    $item.on('mouseenter', () => $(item.el).addClass('layer-hover-highlight'))
                        .on('mouseleave', () => $(item.el).removeClass('layer-hover-highlight'));
                }

                // Per-item lock toggle
                $item.find('.layer-lock-btn').on('click', e => {
                    e.stopPropagation();
                    if (!item.el) return;
                    const locked = item.el.dataset.locked === 'true';
                    item.el.setAttribute('data-locked', locked ? 'false' : 'true');
                    this.showToast(locked ? 'Element unlocked' : 'Element locked', 'success');
                    this.buildLayersTree();
                });

                // Per-item visibility toggle
                $item.find('.layer-vis-btn').on('click', e => {
                    e.stopPropagation();
                    if (!item.el) return;
                    const hidden = $(item.el).css('display') === 'none';
                    $(item.el).css('display', hidden ? '' : 'none');
                    $item.css('opacity', hidden ? 1 : 0.4);
                });

                // Per-item delete
                $item.find('.layer-del-btn').on('click', e => {
                    e.stopPropagation();
                    if (!item.el || item.el.dataset?.locked === 'true') return;
                    if (!this._layerSelectedItems) this._layerSelectedItems = new Map();
                    // Delete just this item unless it's part of a multi-selection
                    if (!this._layerSelectedItems.has(item.el)) {
                        this._clearLayerSelection();
                        this._layerSelectedItems.set(item.el, $item);
                    }
                    this._deleteSelectedLayerItems();
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
                // Guard: skip non-element nodes (e.g. SVG animation elements without dataset)
                if (!el?.dataset) return;
                const $el = $(el);
                const tag = el.tagName.toLowerCase();
                const id = $el.attr('id') || `${tag}_${idx}`;
                const isGroup = tag === 'g';
                const childCount = isGroup ? el.children.length : 0;
                const icon = isGroup ? (childCount > 0 ? '▾' : '◂') : '●';
                const isLocked = el.dataset.locked === 'true';

                const lockIcon = isLocked
                    ? 'material-symbols:lock-outline'
                    : 'material-symbols:lock-open-outline';
                const lockTitle = isLocked ? 'Unlock element' : 'Lock element';

                const $item = $(`
                    <div class="layer-item${isLocked ? ' layer-item-locked' : ''}" data-element-id="${id}" style="margin-left:${depth * 10}px;">
                        <button class="layer-toggle" data-toggle="${id}">${icon}</button>
                        <button class="layer-toggle layer-lock-btn" data-lock-id="${id}" title="${lockTitle}" style="color:${isLocked ? '#fbbf24' : 'rgba(255,255,255,0.3)'};">
                            <iconify-icon icon="${lockIcon}" style="font-size:12px;"></iconify-icon>
                        </button>
                        <button class="layer-toggle" data-visibility="${id}" title="Toggle visibility">
                            <iconify-icon icon="material-symbols:visibility-outline" style="font-size:12px;"></iconify-icon>
                        </button>
                        <span class="layer-name" title="Double-click to rename">${tag}${id ? `#${id}` : ''}</span>
                    </div>
                `);

                // Click on item row → select (unless locked)
                $item.on('click', () => {
                    if (el.dataset.locked === 'true') {
                        this.showToast('Element is locked — click the lock icon to unlock', 'error');
                        return;
                    }
                    this.selectLayer(el, $item);
                });
                $item.on('mouseenter', () => { if (!$item.hasClass('active')) $(el).addClass('layer-hover-highlight'); })
                    .on('mouseleave', () => $(el).removeClass('layer-hover-highlight'));

                $item.find(`[data-toggle="${id}"]`).on('click', e => {
                    e.stopPropagation();
                    $item.toggleClass('collapsed');
                    $item.find(`[data-toggle="${id}"]`).text($item.hasClass('collapsed') ? '▸' : '▾');
                });

                // Lock toggle
                $item.find('.layer-lock-btn').on('click', e => {
                    e.stopPropagation();
                    const locked = el.dataset.locked === 'true';
                    el.setAttribute('data-locked', locked ? 'false' : 'true');
                    this.showToast(locked ? 'Element unlocked' : 'Element locked', 'success');
                    this.buildLayersTree();
                });

                $item.find(`[data-visibility="${id}"]`).on('click', e => {
                    e.stopPropagation();
                    const hidden = $(el).css('display') === 'none';
                    $(el).css('display', hidden ? '' : 'none');
                    $item.css('opacity', hidden ? 1 : 0.4);
                });

                $item.find('.layer-name').on('dblclick', e => {
                    e.stopPropagation();
                    if (el.dataset.locked === 'true') return;
                    this.startLayerRename(el, $item, $(e.currentTarget));
                });

                $panel.append($item);
                // Don't expose wire-group / component-group internals as separate layer entries
                const isInternalGroup = el.classList.contains('wire-group') ||
                    el.classList.contains('component-group');
                if (isGroup && childCount > 0 && !isInternalGroup)
                    build(Array.from(el.children), depth + 1);
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
            if (e.key === 'Enter') { $input.trigger('blur'); }
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
                const svgEl = svgDoc.querySelector('svg');
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

    // ── Layer multi-select helpers ────────────────────────────

    _clearLayerSelection() {
        $('#layersPanel .layer-item, #layersPanel .topo-item').removeClass('layer-selected');
        this._layerSelectedItems = new Map();
    },

    // ── Merge selected layers into a single <g> group ─────────
    _mergeSelectedLayers() {
        if (!this._layerSelectedItems || this._layerSelectedItems.size < 2) {
            this.showToast('Select 2+ layers to merge (Shift+click)', 'error');
            return;
        }
        const els = [...this._layerSelectedItems.keys()].filter(el => el?.isConnected);
        if (els.length < 2) {
            this.showToast('Not enough connected layers to merge', 'error');
            return;
        }

        const before = this._captureFullState?.();
        const NS = this.SVG_NS;
        const g = document.createElementNS(NS, 'g');
        g.id = `merged_${Date.now()}`;
        g.setAttribute('data-geo-class', 'module');

        // Resolve containers (wire-group / component-group wrappers if present)
        const containers = els.map(el => el.closest?.('.wire-group, .component-group') || el);

        // Insert the new group before the first container in document order
        const parent = containers[0].parentNode || this._contentRoot;
        const anchor = containers.reduce((first, c) =>
            first.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_PRECEDING ? c : first
        );
        parent.insertBefore(g, anchor);
        containers.forEach(c => g.appendChild(c));

        const after = this._captureFullState?.();
        this.pushHistory?.('Merge Layers', before, after);

        this._clearLayerSelection();
        this.wires      = (this.wires      || []).filter(w => w.element?.isConnected);
        this.components = (this.components || []).filter(c => c.element?.isConnected);
        this.connectors = (this.connectors || []).filter(c => c.element?.isConnected);
        this._scheduleGeoAnalysis?.();
        this.buildLayersTree();
        this.showToast(`Merged ${els.length} layers → merged_${g.id.split('_')[1]}`, 'success');
    },

    // ── Delete all currently selected layer items ─────────────
    _deleteSelectedLayerItems() {
        if (!this._layerSelectedItems || !this._layerSelectedItems.size) return;

        const els = [...this._layerSelectedItems.keys()].filter(el =>
            el?.isConnected &&
            el?.dataset?.locked !== 'true' &&
            el?.dataset?.seSystem !== 'true'
        );
        const skipped = this._layerSelectedItems.size - els.length;
        if (skipped) this.showToast(`${skipped} locked/system element(s) skipped`, 'error');
        if (!els.length) return;

        const before = this._captureFullState?.();
        els.forEach(el => {
            (el.closest?.('.wire-group, .component-group') || el).remove();
        });

        this._clearLayerSelection();
        this.wires      = (this.wires      || []).filter(w => w.element?.isConnected);
        this.components = (this.components || []).filter(c => c.element?.isConnected);
        this.connectors = (this.connectors || []).filter(c => c.element?.isConnected);
        this._scheduleGeoAnalysis?.();
        const after = this._captureFullState?.();
        this.pushHistory?.('Delete Layers', before, after);
        this.showToast(`Deleted ${els.length} layer${els.length > 1 ? 's' : ''}`, 'success');
    },

    // ── Right-click context menu for layer items ──────────────
    _showLayerContextMenu(x, y) {
        $('#layerCtxMenu').remove();
        const count = this._layerSelectedItems?.size || 0;

        const BTN = 'background:none;border:none;width:100%;text-align:left;padding:7px 14px;' +
                    'cursor:pointer;display:flex;align-items:center;gap:9px;font-size:12px;color:#e2e8f0;';

        const mkItem = (label, icon, action, disabled = false) => {
            const $b = $(`<button style="${BTN}opacity:${disabled ? 0.35 : 1};pointer-events:${disabled ? 'none' : 'auto'};">
                <iconify-icon icon="${icon}" style="font-size:13px;flex-shrink:0;"></iconify-icon>
                <span>${label}</span>
            </button>`);
            if (!disabled) {
                $b.on('mouseenter', () => $b.css('background', 'rgba(79,172,254,0.15)'));
                $b.on('mouseleave', () => $b.css('background', ''));
                $b.on('click', () => { $('#layerCtxMenu').remove(); action(); });
            }
            return $b;
        };

        const $menu = $('<div id="layerCtxMenu">').css({
            position: 'fixed', zIndex: 9999,
            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '4px 0', minWidth: '180px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        });

        $menu.append(mkItem(
            `Select in Canvas (${count})`,
            'material-symbols:touch-app-outline',
            () => {
                this.deselectAll?.();
                this._layerSelectedItems?.forEach((_, el) => this.selectEl?.(el, true));
            },
            count === 0
        ));

        $menu.append($('<hr>').css({ margin: '4px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)' }));

        $menu.append(mkItem(
            `Merge  (Alt+M)`,
            'material-symbols:merge-outline',
            () => this._mergeSelectedLayers(),
            count < 2
        ));

        $menu.append(mkItem(
            `Delete  (${count})`,
            'material-symbols:delete-outline-rounded',
            () => this._deleteSelectedLayerItems(),
            count === 0
        ));

        $('body').append($menu);

        // Clamp to viewport
        const mw = $menu.outerWidth(true) || 180;
        const mh = $menu.outerHeight(true) || 120;
        $menu.css({
            left: Math.min(x, window.innerWidth  - mw - 8),
            top:  Math.min(y, window.innerHeight - mh - 8),
        });

        // Close on outside interaction
        setTimeout(() => {
            $(document).one('mousedown.layerCtx', (e) => {
                if (!$(e.target).closest('#layerCtxMenu').length) $('#layerCtxMenu').remove();
            });
        }, 0);
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
