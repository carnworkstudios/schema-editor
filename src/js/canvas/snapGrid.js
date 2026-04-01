/* ============================================================
   Schematics Editor — Snap Grid
   Configurable grid overlay + magnetic snap for all drawing tools
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Grid state ────────────────────────────────────────────
    initSnapGrid() {
        this._grid = {
            visible:    false,
            snapOn:     true,
            size:       20,
            majorEvery: 5,
            color:      'rgba(120,120,130,0.18)',   // neutral gray minor
            majorColor: 'rgba(100,100,110,0.38)',   // neutral gray major
        };
        this._snapGuides = { h: null, v: null };
        this._renderGridPattern();
        this._bindGridKeys();

        // Default draw style — neutral gray (blue reserved for selection)
        this._drawStyle = {
            stroke:      '#666666',
            strokeWidth: 2,
            fill:        'none',
        };
        // Keep the toolbar color input in sync
        $('#drawStyleStroke').val(this._drawStyle.stroke);
    },

    // ── SVG <defs> pattern ────────────────────────────────────
    _renderGridPattern() {
        const svg   = this.$svgDisplay[0];
        const NS    = this.SVG_NS;
        const g     = this._grid;

        // Remove existing grid layer
        svg.querySelector('#_gridLayer')?.remove();
        svg.querySelector('#_gridDefs')?.remove();

        const defs = document.createElementNS(NS, 'defs');
        defs.id = '_gridDefs';

        // Minor grid pattern
        const minor = document.createElementNS(NS, 'pattern');
        minor.id = '_gridMinor';
        minor.setAttribute('width',  String(g.size));
        minor.setAttribute('height', String(g.size));
        minor.setAttribute('patternUnits', 'userSpaceOnUse');

        const minorPath = document.createElementNS(NS, 'path');
        minorPath.setAttribute('d', `M ${g.size} 0 L 0 0 0 ${g.size}`);
        minorPath.setAttribute('fill', 'none');
        minorPath.setAttribute('stroke', g.color);
        minorPath.setAttribute('stroke-width', '0.5');
        minor.appendChild(minorPath);
        defs.appendChild(minor);

        // Major grid pattern
        const majorSize = g.size * g.majorEvery;
        const major = document.createElementNS(NS, 'pattern');
        major.id = '_gridMajor';
        major.setAttribute('width',  String(majorSize));
        major.setAttribute('height', String(majorSize));
        major.setAttribute('patternUnits', 'userSpaceOnUse');

        const majorBg = document.createElementNS(NS, 'rect');
        majorBg.setAttribute('width',  String(majorSize));
        majorBg.setAttribute('height', String(majorSize));
        majorBg.setAttribute('fill', 'url(#_gridMinor)');
        major.appendChild(majorBg);

        const majorPath = document.createElementNS(NS, 'path');
        majorPath.setAttribute('d', `M ${majorSize} 0 L 0 0 0 ${majorSize}`);
        majorPath.setAttribute('fill', 'none');
        majorPath.setAttribute('stroke', g.majorColor);
        majorPath.setAttribute('stroke-width', '1');
        major.appendChild(majorPath);
        defs.appendChild(major);

        svg.insertBefore(defs, svg.firstChild);

        // Grid layer rect — sized generously so it covers the full
        // panning range (viewBox changes dynamically with zoom/pan)
        const layer = document.createElementNS(NS, 'rect');
        layer.id    = '_gridLayer';
        layer.setAttribute('x',      '-50000');
        layer.setAttribute('y',      '-50000');
        layer.setAttribute('width',  '100000');
        layer.setAttribute('height', '100000');
        layer.setAttribute('fill',   'url(#_gridMajor)');
        layer.setAttribute('pointer-events', 'none');
        layer.style.display = this._grid.visible ? '' : 'none';

        // Insert as first child so it's always behind content
        svg.insertBefore(layer, svg.children[1] || null);
    },

    toggleGrid() {
        this._grid.visible = !this._grid.visible;
        const layer = this.$svgDisplay[0].querySelector('#_gridLayer');
        if (layer) layer.style.display = this._grid.visible ? '' : 'none';
        this.showToast(this._grid.visible ? 'Grid ON' : 'Grid OFF', 'success');
        $('#gridToggleBtn').toggleClass('active', this._grid.visible);
    },

    toggleSnap() {
        this._grid.snapOn = !this._grid.snapOn;
        this.showToast(this._grid.snapOn ? 'Snap ON' : 'Snap OFF', 'success');
        $('#snapToggleBtn').toggleClass('active', this._grid.snapOn);
    },

    setGridSize(size) {
        this._grid.size = parseInt(size, 10) || 20;
        this._renderGridPattern();
    },

    // ── Snap a {x,y} point to the nearest grid intersection ──
    snapPoint(x, y) {
        if (!this._grid.snapOn) return { x, y };
        const s = this._grid.size;
        return {
            x: Math.round(x / s) * s,
            y: Math.round(y / s) * s,
        };
    },

    // ── Snap to nearby elements + grid (smart snap) ──────────
    smartSnap(x, y, excludeIds = []) {
        const snapped = this.snapPoint(x, y);
        const THRESH  = 6;

        // Use BBox map cache if available (no getBBox reflow)
        const bboxSource = this._bboxMap?.size
            ? [...this._bboxMap.entries()]
                .filter(([id]) => !excludeIds.includes(id))
                .map(([, bb]) => bb)
            : null;

        // Fall back to live querySelectorAll+getBBox only when cache is empty
        const bboxes = bboxSource ?? (() => {
            return Array.from(this.$svgDisplay[0].querySelectorAll(
                'rect, circle, ellipse, line, path, polygon, polyline, text'
            )).filter(el =>
                !el.id.startsWith('_grid') &&
                !el.classList.contains('selection-handle') &&
                !el.classList.contains('draw-preview') &&
                !el.classList.contains('snap-guide') &&
                !excludeIds.includes(el.id)
            ).map(el => { try { return el.getBBox(); } catch(_) { return null; } })
             .filter(Boolean);
        })();

        let bestDist = THRESH;
        let result   = snapped;

        bboxes.forEach(bb => {
            if (!bb.width && !bb.height) return;
            const points = [
                { x: bb.x,               y: bb.y               },
                { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 },
                { x: bb.x + bb.width,     y: bb.y + bb.height   },
            ];
            points.forEach(pt => {
                const d = Math.hypot(snapped.x - pt.x, snapped.y - pt.y);
                if (d < bestDist) { bestDist = d; result = { x: pt.x, y: pt.y }; }
            });
        });

        return result;
    },

    // ── Snap guide lines ──────────────────────────────────────
    showSnapGuides(x, y) {
        this._removeSnapGuides();
        const NS  = this.SVG_NS;
        const svg = this.$svgDisplay[0];
        const vb  = (svg.getAttribute('viewBox') || '0 0 2000 2000').split(/\s+/).map(Number);

        const makeGuide = (orientation) => {
            const line = document.createElementNS(NS, 'line');
            line.classList.add('snap-guide');
            if (orientation === 'h') {
                line.setAttribute('x1', String(vb[0]));
                line.setAttribute('y1', String(y));
                line.setAttribute('x2', String(vb[0] + vb[2]));
                line.setAttribute('y2', String(y));
            } else {
                line.setAttribute('x1', String(x));
                line.setAttribute('y1', String(vb[1]));
                line.setAttribute('x2', String(x));
                line.setAttribute('y2', String(vb[1] + vb[3]));
            }
            line.setAttribute('pointer-events', 'none');
            svg.appendChild(line);
            return line;
        };

        this._snapGuides.h = makeGuide('h');
        this._snapGuides.v = makeGuide('v');
    },

    _removeSnapGuides() {
        this._snapGuides.h?.remove();
        this._snapGuides.v?.remove();
        this._snapGuides = { h: null, v: null };
        this.$svgDisplay[0].querySelectorAll('.snap-guide').forEach(el => el.remove());
    },

    // ── Keyboard bindings for grid ────────────────────────────
    _bindGridKeys() {
        $(document).on('keydown.grid', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'g' || e.key === 'G') { e.preventDefault(); this.toggleGrid(); }
        });
    },

    // ── Convert screen coords to SVG coords ──────────────────
    screenToSVG(clientX, clientY) {
        const svg  = this.$svgDisplay[0];
        const pt   = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const m = svg.getScreenCTM();
        if (!m) return { x: clientX, y: clientY };
        const svgPt = pt.matrixTransform(m.inverse());
        return { x: svgPt.x, y: svgPt.y };
    },
});
