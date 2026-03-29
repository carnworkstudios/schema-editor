/* ============================================================
   Schematics Editor — Align & Distribute
   Align 2+ selected elements; distribute evenly H or V
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    initAlignDistribute() {
        // Nothing to init — methods are called directly from PropertyPanel buttons
    },

    // ── Alignment helpers ─────────────────────────────────────

    _alignCheck() {
        if (this._selection.length < 2) {
            this.showToast('Select 2+ elements to align', 'error');
            return false;
        }
        return true;
    },

    _getBBoxes() {
        return this._selection.map(el => {
            try { return { el, bb: el.getBBox() }; }
            catch (_) { return null; }
        }).filter(Boolean);
    },

    _applyAlignTransform(el, dx, dy) {
        const t = el.getAttribute('transform') || '';
        el.setAttribute('transform', `translate(${dx},${dy}) ${t}`);
    },

    // ── Align Left ────────────────────────────────────────────
    alignLeft() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const minX   = Math.min(...bboxes.map(b => b.bb.x));
        bboxes.forEach(({ el, bb }) => this._applyAlignTransform(el, minX - bb.x, 0));
        this._renderHandles();
        this.pushHistory('Align Left', before, this._captureFullState());
        this.showToast('Aligned left', 'success');
    },

    // ── Align Center Horizontal ───────────────────────────────
    alignCenterH() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const minX   = Math.min(...bboxes.map(b => b.bb.x));
        const maxX   = Math.max(...bboxes.map(b => b.bb.x + b.bb.width));
        const cx     = (minX + maxX) / 2;
        bboxes.forEach(({ el, bb }) =>
            this._applyAlignTransform(el, cx - (bb.x + bb.width / 2), 0)
        );
        this._renderHandles();
        this.pushHistory('Align Center H', before, this._captureFullState());
        this.showToast('Aligned center (H)', 'success');
    },

    // ── Align Right ───────────────────────────────────────────
    alignRight() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const maxX   = Math.max(...bboxes.map(b => b.bb.x + b.bb.width));
        bboxes.forEach(({ el, bb }) =>
            this._applyAlignTransform(el, maxX - (bb.x + bb.width), 0)
        );
        this._renderHandles();
        this.pushHistory('Align Right', before, this._captureFullState());
        this.showToast('Aligned right', 'success');
    },

    // ── Align Top ─────────────────────────────────────────────
    alignTop() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const minY   = Math.min(...bboxes.map(b => b.bb.y));
        bboxes.forEach(({ el, bb }) => this._applyAlignTransform(el, 0, minY - bb.y));
        this._renderHandles();
        this.pushHistory('Align Top', before, this._captureFullState());
        this.showToast('Aligned top', 'success');
    },

    // ── Align Center Vertical ─────────────────────────────────
    alignCenterV() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const minY   = Math.min(...bboxes.map(b => b.bb.y));
        const maxY   = Math.max(...bboxes.map(b => b.bb.y + b.bb.height));
        const cy     = (minY + maxY) / 2;
        bboxes.forEach(({ el, bb }) =>
            this._applyAlignTransform(el, 0, cy - (bb.y + bb.height / 2))
        );
        this._renderHandles();
        this.pushHistory('Align Center V', before, this._captureFullState());
        this.showToast('Aligned center (V)', 'success');
    },

    // ── Align Bottom ──────────────────────────────────────────
    alignBottom() {
        if (!this._alignCheck()) return;
        const before = this._captureFullState();
        const bboxes = this._getBBoxes();
        const maxY   = Math.max(...bboxes.map(b => b.bb.y + b.bb.height));
        bboxes.forEach(({ el, bb }) =>
            this._applyAlignTransform(el, 0, maxY - (bb.y + bb.height))
        );
        this._renderHandles();
        this.pushHistory('Align Bottom', before, this._captureFullState());
        this.showToast('Aligned bottom', 'success');
    },

    // ── Distribute Horizontally ───────────────────────────────
    distributeH() {
        if (this._selection.length < 3) {
            this.showToast('Select 3+ elements to distribute', 'error'); return;
        }
        const before = this._captureFullState();
        const bboxes = this._getBBoxes().sort((a, b) => a.bb.x - b.bb.x);
        const first  = bboxes[0].bb.x;
        const last   = bboxes[bboxes.length - 1].bb.x + bboxes[bboxes.length - 1].bb.width;
        const totalW = bboxes.reduce((s, b) => s + b.bb.width, 0);
        const gap    = (last - first - totalW) / (bboxes.length - 1);
        let cursor   = first;
        bboxes.forEach(({ el, bb }) => {
            this._applyAlignTransform(el, cursor - bb.x, 0);
            cursor += bb.width + gap;
        });
        this._renderHandles();
        this.pushHistory('Distribute H', before, this._captureFullState());
        this.showToast('Distributed horizontally', 'success');
    },

    // ── Distribute Vertically ─────────────────────────────────
    distributeV() {
        if (this._selection.length < 3) {
            this.showToast('Select 3+ elements to distribute', 'error'); return;
        }
        const before = this._captureFullState();
        const bboxes = this._getBBoxes().sort((a, b) => a.bb.y - b.bb.y);
        const first  = bboxes[0].bb.y;
        const last   = bboxes[bboxes.length - 1].bb.y + bboxes[bboxes.length - 1].bb.height;
        const totalH = bboxes.reduce((s, b) => s + b.bb.height, 0);
        const gap    = (last - first - totalH) / (bboxes.length - 1);
        let cursor   = first;
        bboxes.forEach(({ el, bb }) => {
            this._applyAlignTransform(el, 0, cursor - bb.y);
            cursor += bb.height + gap;
        });
        this._renderHandles();
        this.pushHistory('Distribute V', before, this._captureFullState());
        this.showToast('Distributed vertically', 'success');
    },
});
