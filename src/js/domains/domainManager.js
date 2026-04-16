/* ============================================================
   Schematics Editor — Domain Manager (Phase 2)
   Mode switching (General | Electrical | UML | Floorplan),
   symbol palette rendering, domain behavior hooks
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Init ──────────────────────────────────────────────────
    initDomainManager() {
        this._domainKits = {};   // name → { symbols[], onActivate, onDeactivate }
        this.activeMode = 'general';

        this._bindModeSwitch();
    },

    // ── Kit registration (called by each domain kit on load) ──
    registerDomainKit(name, kit) {
        // kit: { label, icon, symbols[], onActivate?, onDeactivate?, exportOptions? }
        this._domainKits[name] = kit;
    },

    // ── Mode switch ───────────────────────────────────────────
    switchMode(mode) {
        if (mode === this.activeMode) return;

        // Deactivate old kit
        const old = this._domainKits[this.activeMode];
        if (old?.onDeactivate) old.onDeactivate.call(this);

        this.activeMode = mode;

        // Activate new kit
        const kit = this._domainKits[mode];
        if (kit?.onActivate) kit.onActivate.call(this);

        // Render palette
        this._renderSymbolPalette(mode);

        // Update mode pills
        $('.mode-pill').removeClass('active');
        $(`.mode-pill[data-mode="${mode}"]`).addClass('active');

        // Update export options
        this._updateExportOptionsForMode(mode);

        this.showToast(`${(kit?.label || mode)} mode`, 'success');
    },

    // ── Symbol palette ────────────────────────────────────────
    _renderSymbolPalette(mode) {
        const $palette = $('#symbolPalette');
        if (!$palette.length) return;

        $palette.empty();

        const kit = this._domainKits[mode];
        if (!kit || !kit.symbols?.length) {
            $palette.html('<p class="palette-empty">No symbols for this mode.</p>');
            return;
        }

        const groups = {};
        kit.symbols.forEach(sym => {
            const g = sym.group || 'General';
            if (!groups[g]) groups[g] = [];
            groups[g].push(sym);
        });

        Object.entries(groups).forEach(([groupName, syms]) => {
            const $grpLabel = $(`<div class="palette-group-label">${groupName}</div>`);
            $palette.append($grpLabel);

            const $row = $('<div class="palette-row"></div>');
            syms.forEach(sym => {
                const $item = $(`
                    <div class="palette-item" data-sym-id="${sym.id}" title="${sym.label}">
                        <div class="palette-icon">${sym.svgPreview}</div>
                        <div class="palette-label">${sym.label}</div>
                    </div>
                `);

                // Drag to canvas: mousedown → track → place on mouseup inside SVG
                $item.on('mousedown', (e) => {
                    e.preventDefault();
                    this._startSymbolDrag(sym, e);
                });

                $row.append($item);
            });
            $palette.append($row);
        });
    },

    // ── Drag symbol from palette onto canvas ──────────────────
    _startSymbolDrag(sym, startEvent) {
        const $ghost = $('<div class="palette-drag-ghost">' + sym.svgPreview + '</div>');
        $ghost.css({
            position: 'fixed',
            left: startEvent.clientX - 20,
            top: startEvent.clientY - 20,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.75,
        });
        $('body').append($ghost);

        const onMove = (ev) => {
            $ghost.css({ left: ev.clientX - 20, top: ev.clientY - 20 });
        };

        const onUp = (ev) => {
            $ghost.remove();
            $(document).off('mousemove.symdrag mouseup.symdrag');

            // Check if released over the SVG canvas
            const svgRect = this.$svgContainer[0].getBoundingClientRect();
            if (ev.clientX >= svgRect.left && ev.clientX <= svgRect.right &&
                ev.clientY >= svgRect.top && ev.clientY <= svgRect.bottom) {
                const svgPt = this.screenToSVG(ev.clientX, ev.clientY);
                const snapped = this.smartSnap(svgPt.x, svgPt.y);
                this._placeSymbol(sym, snapped.x, snapped.y);
            } else {
                // Released outside canvas — place at visible center
                const cx = svgRect.left + svgRect.width  / 2;
                const cy = svgRect.top  + svgRect.height / 2;
                const center = this.screenToSVG(cx, cy);
                const snapped = this.smartSnap(center.x, center.y);
                this._placeSymbol(sym, snapped.x, snapped.y);
            }
        };

        $(document).on('mousemove.symdrag', onMove).on('mouseup.symdrag', onUp);
    },

    // ── Place a symbol SVG on the canvas ─────────────────────
    _placeSymbol(sym, x, y) {
        const before = this._captureFullState();
        const NS = this.SVG_NS;
        const parser = new DOMParser();

        const svgStr = sym.svgContent || sym.svgPreview;
        const doc = parser.parseFromString(
            `<svg xmlns="http://www.w3.org/2000/svg">${svgStr}</svg>`,
            'image/svg+xml'
        );

        if (doc.querySelector('parsererror')) {
            this.showToast('Symbol parse error', 'error'); return;
        }

        const g = document.createElementNS(NS, 'g');
        g.id = `sym_${sym.id}_${Date.now()}`;
        g.setAttribute('class', `domain-symbol symbol-${sym.id}`);
        g.setAttribute('transform', `translate(${x},${y})`);
        g.setAttribute('data-symbol', sym.id);
        g.setAttribute('data-domain', this.activeMode);

        // Import all children from the parsed SVG
        Array.from(doc.documentElement.children).forEach(child => {
            g.appendChild(document.importNode(child, true));
        });

        // Add component label if symbol has a default value
        if (sym.defaultValue) {
            const label = document.createElementNS(NS, 'text');
            label.setAttribute('x', '0');
            label.setAttribute('y', (sym.labelOffsetY || 30).toString());
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '10');
            label.setAttribute('font-family', 'Inter, monospace');
            label.setAttribute('fill', '#030c13ff');
            label.setAttribute('class', 'sym-value');
            label.textContent = sym.defaultValue;
            g.appendChild(label);
        }

        this._contentRoot.appendChild(g);
        const after = this._captureFullState();
        this.pushHistory(`Place ${sym.label}`, before, after);
        this.selectEl(g);
        this.showToast(`Placed: ${sym.label}`, 'success');
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
    },

    // ── Export options per mode ───────────────────────────────
    _updateExportOptionsForMode(mode) {
        // Show/hide domain-specific export buttons
        $('.export-domain-btn').hide();
        $(`.export-domain-btn[data-mode="${mode}"]`).show();
    },

    // ── Mode pill binding ─────────────────────────────────────
    _bindModeSwitch() {
        $(document).on('click', '.mode-pill', (e) => {
            const mode = $(e.currentTarget).data('mode');
            if (mode) this.switchMode(mode);
        });
    },
});
