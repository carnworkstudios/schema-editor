/* ============================================================
   SVG Wiring Editor — Layers Feature
   Layers tree panel (side panel) + Timeline thumbnail filmstrip
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Layers tree (side panel) — unchanged behaviour ────────

    showLayers() {
        this.$sidePanel.addClass('open');
        this.buildLayersTree();
    },

    buildLayersTree() {
        const $panel = $('#layersPanel');
        $panel.empty();

        const rootElements = Array.from(this.$svgDisplay[0].children);
        if (rootElements.length === 0) {
            $panel.html('<p style="color:rgba(255,255,255,0.4);font-size:11px;padding:8px;">Load an SVG to see layers.</p>');
            return;
        }

        const buildTree = (elements, depth) => {
            elements.forEach((el, idx) => {
                const $el      = $(el);
                const tag      = el.tagName.toLowerCase();
                const id       = $el.attr('id') || `${tag}_${idx}`;
                const isGroup  = tag === 'g';
                const childCount = isGroup ? el.children.length : 0;

                const toggleIcon = isGroup ? (childCount > 0 ? '▾' : '◂') : '●';

                const $item = $(`
                    <div class="layer-item" data-element-id="${id}" style="margin-left:${depth * 10}px;">
                        <button class="layer-toggle" data-toggle="${id}">${toggleIcon}</button>
                        <button class="layer-toggle" data-visibility="${id}" title="Toggle visibility">
                            <iconify-icon icon="material-symbols:visibility-outline" style="font-size:12px;"></iconify-icon>
                        </button>
                        <span class="layer-name" title="Double-click to rename">${tag}${id ? `#${id}` : ''}</span>
                    </div>
                `);

                $item.on('click', () => this.selectLayer(el, $item));

                $item.on('mouseenter', () => {
                    if (!$item.hasClass('active')) $(el).addClass('layer-hover-highlight');
                }).on('mouseleave', () => {
                    $(el).removeClass('layer-hover-highlight');
                });

                $item.find(`[data-toggle="${id}"]`).on('click', (e) => {
                    e.stopPropagation();
                    $item.toggleClass('collapsed');
                    $item.find(`[data-toggle="${id}"]`).text($item.hasClass('collapsed') ? '▸' : '▾');
                });

                $item.find(`[data-visibility="${id}"]`).on('click', (e) => {
                    e.stopPropagation();
                    const hidden = $(el).css('display') === 'none';
                    $(el).css('display', hidden ? '' : 'none');
                    $item.css('opacity', hidden ? 1 : 0.4);
                });

                $item.find('.layer-name').on('dblclick', (e) => {
                    e.stopPropagation();
                    this.startLayerRename(el, $item, $(e.currentTarget));
                });

                $panel.append($item);

                if (isGroup && childCount > 0) {
                    buildTree(Array.from(el.children), depth + 1);
                }
            });
        };

        buildTree(rootElements, 0);
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
