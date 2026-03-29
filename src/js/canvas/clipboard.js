/* ============================================================
   Schematics Editor — Clipboard
   Cut / Copy / Paste / Duplicate with SVG serialization
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    initClipboard() {
        this._clipboard = null;   // { elements: SVGString[], bbox }
        this._pasteOffset = 0;    // increments on each paste to avoid stacking
        this._bindClipboardKeys();
    },

    copySelected() {
        if (!this._selection.length) { this.showToast('Nothing selected', 'error'); return; }
        const xs = new XMLSerializer();
        const bb = this._getSelectionBBox() || { x: 0, y: 0, width: 0, height: 0 };
        this._clipboard = {
            elements: this._selection.map(el => xs.serializeToString(el)),
            bbox:     { ...bb },
        };
        this._pasteOffset = 0;
        this.showToast(`Copied ${this._selection.length} element(s)`, 'success');
    },

    cutSelected() {
        if (!this._selection.length) { this.showToast('Nothing selected', 'error'); return; }
        this.copySelected();
        this.deleteSelected();
        this.showToast(`Cut ${this._clipboard?.elements.length || 0} element(s)`, 'success');
    },

    pasteClipboard() {
        if (!this._clipboard) { this.showToast('Clipboard is empty', 'error'); return; }
        const before   = this._captureFullState();
        const NS       = this.SVG_NS;
        const parser   = new DOMParser();
        const offset   = 16 * (++this._pasteOffset);
        const newEls   = [];

        this._clipboard.elements.forEach(svgStr => {
            try {
                const doc = parser.parseFromString(svgStr, 'image/svg+xml');
                const el  = doc.documentElement;
                if (!el || el.tagName === 'parsererror') return;

                // Import node into this document
                const imported = document.importNode(el, true);
                // Offset position
                const existing = imported.getAttribute('transform') || '';
                imported.setAttribute('transform', `translate(${offset},${offset}) ${existing}`);
                // New unique id
                imported.id = `el_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
                this.$svgDisplay[0].appendChild(imported);
                newEls.push(imported);
            } catch (err) {
                console.warn('Paste error:', err);
            }
        });

        const after = this._captureFullState();
        this.pushHistory('Paste', before, after);

        // Select pasted elements
        this.deselectAll();
        newEls.forEach(el => this.selectEl(el, true));
        this.showToast(`Pasted ${newEls.length} element(s)`, 'success');
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
    },

    duplicateSelected() {
        if (!this._selection.length) { this.showToast('Nothing selected', 'error'); return; }
        this.copySelected();
        this.pasteClipboard();
        this.showToast('Duplicated', 'success');
    },

    _bindClipboardKeys() {
        $(document).on('keydown.clipboard', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;

            if (e.key === 'c' && !e.shiftKey) { e.preventDefault(); this.copySelected(); }
            if (e.key === 'x' && !e.shiftKey) { e.preventDefault(); this.cutSelected(); }
            if (e.key === 'v' && !e.shiftKey) { e.preventDefault(); this.pasteClipboard(); }
            if (e.key === 'd' && !e.shiftKey) { e.preventDefault(); this.duplicateSelected(); }
        });
    },
});
