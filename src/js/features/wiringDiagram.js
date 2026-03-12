/* ============================================================
   SVG Wiring Editor — Wiring Diagram Feature
   SVG file loading, element analysis, interaction setup
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    loadSVGFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
                const svgElement = svgDoc.querySelector('svg');

                if (!svgElement) throw new Error('Invalid SVG file');

                this.$svgDisplay.empty();

                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                    this.$svgDisplay.attr('viewBox', viewBox);
                    this.originalViewBox = viewBox;
                }

                $(svgElement).children().each((_, child) => {
                    this.$svgDisplay.append($(child).clone());
                });

                this.setupSVGInteractions();
                this.analyzeWiringDiagram();
                this.resetView();
                this.updateMiniMap();
                this.showToast('SVG loaded successfully!', 'success');
                this.closeSidePanel();
            } catch (err) {
                this.showToast('Error loading SVG: ' + err.message, 'error');
            } finally {
                this.showLoading(false);
            }
        };

        reader.readAsText(file);
    },

    setupSVGInteractions() {
        this.analyzeWiringDiagram();

        if ('ontouchstart' in window) return;

        this.$svgDisplay.find('path, line, polyline, polygon, circle, ellipse, rect, g').each((_, el) => {
            const $el = $(el);
            $el.on('mouseenter', () => {
                if (!this.selectedElements.includes(el)) this.highlightElement($el, true);
            });
            $el.on('mouseleave', () => {
                if (!this.selectedElements.includes(el)) this.highlightElement($el, false);
            });
        });
    },

    analyzeWiringDiagram() {
        this.wires = [];
        this.components = [];
        this.connections = [];

        const SVG_NS = this.SVG_NS;

        // ── Wire detection ──────────────────────────────────
        this.$svgDisplay.find(
            'line, path[d*="L"], path[d*="l"], path[d*="v"], path[d*="V"], path[d*="h"], path[d*="H"], polyline'
        ).each((index, origEl) => {
            const $orig = $(origEl);
            const originalStroke = $orig.attr('stroke') || 'black';
            const originalStrokeWidth = parseFloat($orig.attr('stroke-width') || '1');

            // Wrap in a group with a hitbox overlay
            const group = document.createElementNS(SVG_NS, 'g');
            group.setAttribute('class', 'wire-group');
            group.setAttribute('data-wire-id', `wire_${index}`);

            const cloneVisual = origEl.cloneNode(true);

            const cloneHitbox = origEl.cloneNode(true);
            cloneHitbox.setAttribute('stroke', originalStroke);
            cloneHitbox.setAttribute('stroke-opacity', '0');
            cloneHitbox.setAttribute('fill', 'none');
            cloneHitbox.setAttribute('class', 'wire-hitbox');
            cloneHitbox.setAttribute('data-wire-id', `wire_${index}`);

            group.appendChild(cloneVisual);
            group.appendChild(cloneHitbox);
            origEl.parentNode.replaceChild(group, origEl);

            this.wires.push({
                element: cloneVisual,
                $element: $(cloneVisual),
                $hitbox: $(cloneHitbox),
                $group: $(group),
                id: `wire_${index}`,
                color: originalStroke,
                width: originalStrokeWidth,
            });
        });

        // ── Component detection ─────────────────────────────
        this.$svgDisplay.find(
            'circle, rect, polygon, ellipse, path[d*="c"], path[d*="C"], path[d*="s"], path[d*="S"], g'
        ).each((index, el) => {
            const $el = $(el);
            const bbox = el.getBBox ? el.getBBox() : { width: 0, height: 0 };
            if (bbox.width > 10 || bbox.height > 10) {
                this.components.push({
                    element: el,
                    $element: $el,
                    id: `component_${index}`,
                    bbox,
                    type: this.identifyComponentType($el),
                });
            }
        });

        console.log(`SVG analyzed: ${this.wires.length} wires, ${this.components.length} components`);
    },

    identifyComponentType($element) {
        const tag = $element[0].tagName.toLowerCase();
        const cls = $element.attr('class') || '';
        const id  = $element.attr('id') || '';

        if (tag === 'circle') return 'connector';
        if (tag === 'rect') return 'module';
        if (cls.includes('resistor')) return 'resistor';
        if (cls.includes('capacitor')) return 'capacitor';
        if (cls.includes('switch')) return 'switch';
        if (id.includes('relay')) return 'relay';
        return 'component';
    },

    // ── Selection helpers ────────────────────────────────────

    handleTap(event) {
        const target = event.target;
        if (target && target !== this.$svgContainer[0] && target !== this.$svgWrapper[0]) {
            this.selectElement($(target));
        }
    },

    selectElement($element) {
        this.selectedElements = [$element[0]];
        $element.addClass('selected-element');
        this.showElementInfo($element);
        if (this.isWire($element)) {
            this.highlightConnectedComponents($element);
        }
    },

    isWire($element) {
        return this.wires.some(w => w.element === $element[0]);
    },

    showElementInfo($element) {
        const tag = $element[0].tagName;
        const cls = $element.attr('class') || 'None';
        const id  = $element.attr('id') || 'None';
        this.showToast(`${tag}  cls:${cls}  id:${id}`, 'success');
    },

    clearSelection() {
        this.selectedElements.forEach(el => $(el).removeClass('selected-element'));
        this.selectedElements = [];
        this.clearAllHighlights();
    },

    highlightConnectedComponents($wireElement) {
        const wireEndPoints = this.getWireEndPoints($wireElement);
        this.components.forEach(comp => {
            const b = comp.bbox;
            wireEndPoints.forEach(pt => {
                const dist = Math.hypot(pt.x - (b.x + b.width / 2), pt.y - (b.y + b.height / 2));
                if (dist < 20) comp.$element.addClass('component-highlight');
            });
        });
    },

    getWireEndPoints($wire) {
        const el = $wire[0];
        const pts = [];
        if (el.tagName === 'line') {
            pts.push(
                { x: parseFloat($wire.attr('x1')), y: parseFloat($wire.attr('y1')) },
                { x: parseFloat($wire.attr('x2')), y: parseFloat($wire.attr('y2')) }
            );
        } else if (el.tagName === 'path') {
            const m = ($wire.attr('d') || '').match(/[\d.]+/g);
            if (m && m.length >= 4) {
                pts.push(
                    { x: parseFloat(m[0]), y: parseFloat(m[1]) },
                    { x: parseFloat(m[m.length - 2]), y: parseFloat(m[m.length - 1]) }
                );
            }
        }
        return pts;
    },

    highlightElement($element, on) {
        if (on) {
            $element.css({ stroke: '#4facfe' });
        } else {
            $element.css({ stroke: '', 'stroke-width': '', filter: '' });
        }
    },
});
