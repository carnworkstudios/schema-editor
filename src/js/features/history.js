/* ============================================================
   SVG Wiring Editor; Undo/Redo History
   Snapshot-based history for highlight operations
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    /**
     * Capture a snapshot of every SVG element's highlight state:
     * class attribute + relevant inline styles.
     * Called BEFORE and AFTER each highlight operation.
     */
    captureHighlightState() {
        const entries = [];
        this.$svgDisplay.find('*').each(function () {
            entries.push({
                el:          this,
                cls:         this.getAttribute('class') || '',
                stroke:      this.style.stroke,
                strokeWidth: this.style.strokeWidth,
                filter:      this.style.filter,
                fill:        this.style.fill,
            });
        });
        return entries;
    },

    /**
     * Restore a previously captured snapshot.
     */
    restoreHighlightState(entries) {
        entries.forEach(({ el, cls, stroke, strokeWidth, filter, fill }) => {
            if (!document.contains(el)) return; // element may have been removed
            el.setAttribute('class', cls);
            el.style.stroke      = stroke;
            el.style.strokeWidth = strokeWidth;
            el.style.filter      = filter;
            el.style.fill        = fill;
        });
    },

    /**
     * Push a new history entry.
     * Discards any redo states above the current index.
     *
     * @param {string} label   Human-readable action name
     * @param {Array}  before  Snapshot taken before the action
     * @param {Array}  after   Snapshot taken after the action
     */
    pushHistory(label, before, after) {
        // Trim redo tail
        this._historyStack = this._historyStack.slice(0, this._historyIndex + 1);
        this._historyStack.push({ label, before, after });
        this._historyIndex++;
        this._syncUndoRedoUI();
    },

    undo() {
        if (this._historyIndex < 0) return;
        const entry = this._historyStack[this._historyIndex];
        this.restoreHighlightState(entry.before);
        this._historyIndex--;
        this._syncUndoRedoUI();
        this.showToast(`Undo: ${entry.label}`, 'success');
    },

    redo() {
        if (this._historyIndex >= this._historyStack.length - 1) return;
        this._historyIndex++;
        const entry = this._historyStack[this._historyIndex];
        this.restoreHighlightState(entry.after);
        this._syncUndoRedoUI();
        this.showToast(`Redo: ${entry.label}`, 'success');
    },

    _syncUndoRedoUI() {
        const canUndo = this._historyIndex >= 0;
        const canRedo = this._historyIndex < this._historyStack.length - 1;
        $('#undoBtn').prop('disabled', !canUndo).toggleClass('disabled', !canUndo);
        $('#redoBtn').prop('disabled', !canRedo).toggleClass('disabled', !canRedo);
    },
});
