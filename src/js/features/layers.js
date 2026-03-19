/* ============================================================
   SVG Wiring Editor — Layers Feature
   Layers tree panel, visibility toggles, layer selection
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

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
                const $el     = $(el);
                const tag     = el.tagName.toLowerCase();
                const id      = $el.attr('id') || `${tag}_${idx}`;
                const isGroup = tag === 'g';
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

                // Hover: highlight the corresponding SVG element in the display
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

                // Double-click on the name label → inline rename
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
        // Remove hover highlight now that it's selected
        $(element).removeClass('layer-hover-highlight');
        this.clearSelection();
        this.selectedElements = [element];
        $(element).addClass('component-highlight');
        this.showToast(`Selected: ${element.tagName}#${$(element).attr('id') || 'unnamed'}`, 'success');
    },

    startLayerRename(svgEl, $item, $nameSpan) {
        if ($item.find('.layer-name-input').length) return; // already editing

        const tag = svgEl.tagName.toLowerCase();
        const currentId = $(svgEl).attr('id') || '';
        const $input = $('<input type="text" class="layer-name-input">')
            .val(currentId)
            .attr('placeholder', 'layer-name');

        $nameSpan.replaceWith($input);
        $input[0].focus();
        $input[0].select();

        const commit = () => {
            // Sanitize: trim, replace spaces with hyphens, strip invalid XML id chars
            const raw = $input.val().trim();
            const newId = raw
                ? raw.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-:.]/g, '')
                : currentId;

            // Apply to SVG element — used by export (id attr is preserved on serialization)
            if (newId) svgEl.setAttribute('id', newId);
            $item.attr('data-element-id', newId || currentId);

            const label = `${tag}${newId ? `#${newId}` : ''}`;
            const $newSpan = $(`<span class="layer-name" title="Double-click to rename">${label}</span>`);
            $input.replaceWith($newSpan);

            // Re-bind rename on the new span
            $newSpan.on('dblclick', (e) => {
                e.stopPropagation();
                this.startLayerRename(svgEl, $item, $newSpan);
            });
        };

        $input.on('blur', commit);
        $input.on('keydown', (e) => {
            if (e.key === 'Enter')  { $input.trigger('blur'); }
            if (e.key === 'Escape') { $input.replaceWith($nameSpan); } // cancel
        });
    },
});
