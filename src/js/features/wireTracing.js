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
        this.showToast('Wire tracing ON — tap a wire or component to trace', 'success');

        this.wires.forEach(wire => {
            wire.$hitbox.on('click.tracing', (e) => {
                e.stopPropagation();
                this.traceWirePath(wire);
            });
        });

        this.components.forEach(comp => {
            comp.$hitbox.on('click.tracing', (e) => {
                e.stopPropagation();
                this.traceComponent(comp);
            });
        });
    },

    stopWireTracing() {
        this.isWireTracing = false;
        this.showToast('Wire tracing OFF', 'success');
        this.wires.forEach(wire => wire.$hitbox.off('click.tracing'));
        this.components.forEach(comp => comp.$hitbox.off('click.tracing'));
        this.clearAllHighlights();
    },

    traceComponent(selectedComp) {
        this.showLoading(true);
        const before = this.captureHighlightState();

        // Highlight the tapped component
        selectedComp.$element.addClass('component-highlight');

        // Find wires whose endpoints fall within (or near) the component's bounding box
        const b = selectedComp.bbox;
        const PAD = 10;
        const connected = [];

        this.wires.forEach(wire => {
            const pts = this.getWireEndPoints(wire.$element);
            const touches = pts.some(pt =>
                pt.x >= b.x - PAD && pt.x <= b.x + b.width + PAD &&
                pt.y >= b.y - PAD && pt.y <= b.y + b.height + PAD
            );
            if (touches) {
                connected.push(wire);
                const t = wire.$element[0].tagName.toLowerCase();
                wire.$element.addClass(t === 'rect' ? 'selected-element' : 'wire-trace');
            }
        });

        const after = this.captureHighlightState();
        this.pushHistory('Trace Component', before, after);
        this.showToast(`Traced component: ${selectedComp.type} — ${connected.length} wire(s) connected`, 'success');
        this.showLoading(false);
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
