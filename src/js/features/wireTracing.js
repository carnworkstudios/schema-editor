/* ============================================================
   SVG Wiring Editor — Wire Tracing Feature
   Toggle tracing mode, trace paths, find connected wires
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    toggleWireTracing() {
        if (this.isWireTracing) {
            this.stopWireTracing();
        } else {
            this.startWireTracing();
        }
        // Sync switch visual state
        $('#traceWireBtn').toggleClass('active', this.isWireTracing);
    },

    startWireTracing() {
        this.isWireTracing = true;
        this.showToast('Wire tracing ON — tap a wire to trace', 'success');

        this.wires.forEach(wire => {
            wire.$hitbox.on('click.tracing', (e) => {
                e.stopPropagation();
                this.traceWirePath(wire);
            });
        });
    },

    stopWireTracing() {
        this.isWireTracing = false;
        this.showToast('Wire tracing OFF', 'success');
        this.wires.forEach(wire => wire.$hitbox.off('click.tracing'));
        this.clearAllHighlights();
    },

    traceWirePath(selectedWire) {
        this.showLoading(true);

        const before = this.captureHighlightState();

        const elType = selectedWire.$element[0].tagName.toLowerCase();
        if (elType === 'rect') {
            selectedWire.$element.addClass('selected-element');
        } else {
            selectedWire.$element.addClass('wire-trace');
        }

        const connected = this.findConnectedWires(selectedWire);
        connected.forEach(wire => {
            const t = wire.$element[0].tagName.toLowerCase();
            wire.$element.addClass(t === 'rect' ? 'selected-element' : 'wire-trace');
        });

        this.highlightConnectedComponents(selectedWire.$element);

        const after = this.captureHighlightState();
        this.pushHistory('Trace Wire', before, after);

        this.showToast(`Traced ${connected.length + 1} segment(s)`, 'success');
        this.showLoading(false);
    },

    findConnectedWires(startWire) {
        const connected = [];
        const startPts  = this.getWireEndPoints(startWire.$element);
        const epsilon   = 0.5;

        this.wires.forEach(wire => {
            if (wire.id === startWire.id) return;
            const pts = this.getWireEndPoints(wire.$element);
            outer: for (const a of startPts) {
                for (const b of pts) {
                    if (Math.hypot(a.x - b.x, a.y - b.y) <= epsilon) {
                        connected.push(wire);
                        break outer;
                    }
                }
            }
        });

        return connected;
    },
});
