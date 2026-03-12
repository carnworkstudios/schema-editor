/* ============================================================
   SVG Wiring Editor — Highlights Feature
   Component highlights, connection colouring, clear all
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    highlightComponents() {
        this.showLoading(true);
        const before = this.captureHighlightState();

        this.components.forEach(comp => comp.$element.addClass('component-highlight'));

        const after = this.captureHighlightState();
        this.pushHistory('Highlight Components', before, after);

        this.showToast(`Highlighted ${this.components.length} components`, 'success');
        this.showLoading(false);
    },

    hideComponentBox() {
        const before = this.captureHighlightState();
        this.components.forEach(comp => comp.$element.removeClass('component-highlight'));
        const after = this.captureHighlightState();
        this.pushHistory('Hide Components', before, after);
        this.showToast('Component highlights removed', 'success');
    },

    showConnections() {
        const before = this.captureHighlightState();
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#6c5ce7'];

        this.wires.forEach((wire, i) => {
            const color = colors[i % colors.length];
            const isSpecialPath = wire.$element.is('path') &&
                wire.$element.attr('d') &&
                /[lvVhH]/.test(wire.$element.attr('d'));
            wire.$element.css({ stroke: isSpecialPath ? '#4facfe' : color });
        });

        const after = this.captureHighlightState();
        this.pushHistory('Show Connections', before, after);
        this.showToast('Showing wire connections', 'success');
    },

    hideConnections() {
        const before = this.captureHighlightState();
        this.wires.forEach(wire => wire.$element.css({ stroke: '', 'stroke-width': '', filter: '' }));
        const after = this.captureHighlightState();
        this.pushHistory('Hide Connections', before, after);
        this.showToast('Wire connections hidden', 'success');
    },

    clearAllHighlights() {
        const before = this.captureHighlightState();

        this.$svgDisplay.find('.wire-trace, .component-highlight, .selected-element')
            .removeClass('wire-trace component-highlight selected-element');

        this.$svgDisplay.find('*').each((_, el) => {
            const $el = $(el);
            $el.css({ stroke: '', 'stroke-width': '', filter: '', fill: '' });
        });

        const after = this.captureHighlightState();
        this.pushHistory('Clear Highlights', before, after);
    },
});
