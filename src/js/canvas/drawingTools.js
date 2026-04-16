/* ============================================================
   Schematics Editor — Drawing Tools
   Pen, Line, Rectangle, Ellipse, Polygon, Text
   Each tool: preview on drag → commit on mouseup/dblclick
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Tool activation ───────────────────────────────────────
    initDrawingTools() {
        this._drawState   = null;   // active draw operation
        this._drawPreview = null;   // ghost/preview element

        // Default style for new elements
        this._drawStyle = {
            stroke:         '#4facfe',
            strokeWidth:    '2',
            fill:           'none',
            fillOpacity:    '1',
            strokeDasharray:'none',
        };

        this._bindDrawEvents();
    },

    setActiveTool(tool) {
        this.activeTool = tool;

        // Update toolbar active state
        $('.draw-tool-btn').removeClass('active');
        $(`#tool_${tool}`).addClass('active');

        // Cursor
        const cursors = {
            select:  'default',
            pen:     'crosshair',
            line:    'crosshair',
            rect:    'crosshair',
            ellipse: 'crosshair',
            polygon: 'crosshair',
            text:    'text',
            wire:    'crosshair',
        };
        this.$svgContainer.css('cursor', cursors[tool] || 'default');

        // If leaving draw mode, cancel any in-progress draw
        if (!['pen','line','rect','ellipse','polygon','text','wire'].includes(tool)) {
            this._cancelDraw();
        }

        // Toggle select-mode canvas listener
        if (tool === 'select') {
            this.$svgContainer.css('cursor', 'default');
        }

        this.showToast(
            { select:'Select', pen:'Pen', line:'Line', rect:'Rectangle',
              ellipse:'Ellipse', polygon:'Polygon', text:'Text', wire:'Wire'}[tool] + ' tool',
            'success'
        );
    },

    // ── Main draw event binding ───────────────────────────────
    _bindDrawEvents() {
        this.$svgContainer.on('mousedown.draw', (e) => {
            const drawTools = ['pen','line','rect','ellipse','polygon','text','wire'];
            if (!drawTools.includes(this.activeTool)) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            const pt = this.screenToSVG(e.clientX, e.clientY);
            const snapped = this.smartSnap(pt.x, pt.y);

            switch (this.activeTool) {
                case 'pen':     this._penStart(snapped, e); break;
                case 'line':    this._lineStart(snapped); break;
                case 'rect':    this._rectStart(snapped); break;
                case 'ellipse': this._ellipseStart(snapped); break;
                case 'polygon': this._polygonClick(snapped); break;
                case 'text':    this._textPlace(snapped); break;
                case 'wire':    this._wireStart(snapped); break;
            }
        });

        $(document).on('mousemove.draw', (e) => {
            if (!this._drawState) return;
            const pt      = this.screenToSVG(e.clientX, e.clientY);
            const snapped = this.smartSnap(pt.x, pt.y);

            switch (this.activeTool) {
                case 'pen':     this._penMove(snapped, e); break;
                case 'line':    this._lineMove(snapped); break;
                case 'rect':    this._rectMove(snapped); break;
                case 'ellipse': this._ellipseMove(snapped); break;
                case 'wire':    this._wireMove(snapped); break;
            }
        });

        $(document).on('mouseup.draw', (e) => {
            if (!this._drawState) return;

            switch (this.activeTool) {
                case 'pen':     this._penEnd(); break;
                case 'line':    this._lineEnd(); break;
                case 'rect':    this._rectEnd(); break;
                case 'ellipse': this._ellipseEnd(); break;
                case 'wire':    this._wireEnd(); break;
            }
        });

        // Double-click to finish polygon
        this.$svgContainer.on('dblclick.draw', (e) => {
            if (this.activeTool === 'polygon' && this._drawState) {
                e.preventDefault();
                this._polygonClose();
            }
        });

        // Escape cancels
        $(document).on('keydown.draw', (e) => {
            if (e.key === 'Escape' && this._drawState) {
                e.preventDefault();
                this._cancelDraw();
            }
        });
    },

    // ── Drawing style helpers ─────────────────────────────────
    _applyDrawStyle(el) {
        const s = this._drawStyle;
        el.setAttribute('stroke', s.stroke);
        el.setAttribute('stroke-width', s.strokeWidth);
        el.setAttribute('fill', s.fill);
        if (s.fill !== 'none') el.setAttribute('fill-opacity', s.fillOpacity);
        if (s.strokeDasharray !== 'none') el.setAttribute('stroke-dasharray', s.strokeDasharray);
    },

    _makePreview(tagName) {
        this._drawPreview?.remove();
        const el = document.createElementNS(this.SVG_NS, tagName);
        el.classList.add('draw-preview');
        el.setAttribute('pointer-events', 'none');
        this._applyDrawStyle(el);
        this._contentRoot.appendChild(el);
        this._drawPreview = el;
        return el;
    },

    _commitElement(el) {
        this._drawPreview?.remove();
        this._drawPreview = null;
        // Assign unique id
        el.id = `el_${Date.now()}_${Math.floor(Math.random()*9999)}`;
        this._applyDrawStyle(el);
        this._contentRoot.appendChild(el);
        const after = this._captureFullState();
        this.pushHistory('Draw', this._drawState?.before || '', after);
        this._drawState = null;
        this.selectEl(el);
        this._refreshPropertyPanel();
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
        return el;
    },

    _cancelDraw() {
        this._drawPreview?.remove();
        this._drawPreview = null;
        this._drawState   = null;
    },

    // ── PEN (freehand) ────────────────────────────────────────
    _penStart(pt, e) {
        this._drawState = {
            before: this._captureFullState(),
            points: [pt],
        };
        const el = this._makePreview('path');
        el.setAttribute('d', `M ${pt.x} ${pt.y}`);
    },

    _penMove(pt) {
        if (!this._drawState) return;
        this._drawState.points.push(pt);
        // Smooth curve through all points using Catmull-Rom
        const d = this._pointsToCurve(this._drawState.points);
        this._drawPreview.setAttribute('d', d);
    },

    _penEnd() {
        if (!this._drawState || this._drawState.points.length < 2) {
            this._cancelDraw(); return;
        }
        const el = document.createElementNS(this.SVG_NS, 'path');
        el.setAttribute('d', this._pointsToCurve(this._drawState.points));
        this._commitElement(el);
    },

    _pointsToCurve(pts) {
        if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length - 1; i++) {
            const cp1x = pts[i].x;
            const cp1y = pts[i].y;
            const x    = (pts[i].x + pts[i+1].x) / 2;
            const y    = (pts[i].y + pts[i+1].y) / 2;
            d += ` Q ${cp1x} ${cp1y} ${x} ${y}`;
        }
        const last = pts[pts.length - 1];
        d += ` L ${last.x} ${last.y}`;
        return d;
    },

    // ── LINE ──────────────────────────────────────────────────
    _lineStart(pt) {
        this._drawState = {
            before: this._captureFullState(),
            x1: pt.x, y1: pt.y,
        };
        const el = this._makePreview('line');
        el.setAttribute('x1', pt.x); el.setAttribute('y1', pt.y);
        el.setAttribute('x2', pt.x); el.setAttribute('y2', pt.y);
    },

    _lineMove(pt) {
        if (!this._drawPreview) return;
        this._drawPreview.setAttribute('x2', pt.x);
        this._drawPreview.setAttribute('y2', pt.y);
    },

    _lineEnd() {
        if (!this._drawState) return;
        const p = this._drawPreview;
        if (
            parseFloat(p.getAttribute('x1')) === parseFloat(p.getAttribute('x2')) &&
            parseFloat(p.getAttribute('y1')) === parseFloat(p.getAttribute('y2'))
        ) { this._cancelDraw(); return; }

        const el = document.createElementNS(this.SVG_NS, 'line');
        el.setAttribute('x1', p.getAttribute('x1'));
        el.setAttribute('y1', p.getAttribute('y1'));
        el.setAttribute('x2', p.getAttribute('x2'));
        el.setAttribute('y2', p.getAttribute('y2'));
        this._commitElement(el);
    },

    // ── RECTANGLE ─────────────────────────────────────────────
    _rectStart(pt) {
        this._drawState = {
            before: this._captureFullState(),
            x: pt.x, y: pt.y,
        };
        const el = this._makePreview('rect');
        el.setAttribute('x', pt.x); el.setAttribute('y', pt.y);
        el.setAttribute('width', '0'); el.setAttribute('height', '0');
    },

    _rectMove(pt) {
        if (!this._drawPreview || !this._drawState) return;
        const x = Math.min(this._drawState.x, pt.x);
        const y = Math.min(this._drawState.y, pt.y);
        const w = Math.abs(pt.x - this._drawState.x);
        const h = Math.abs(pt.y - this._drawState.y);
        this._drawPreview.setAttribute('x', x);
        this._drawPreview.setAttribute('y', y);
        this._drawPreview.setAttribute('width',  w);
        this._drawPreview.setAttribute('height', h);
    },

    _rectEnd() {
        if (!this._drawState) return;
        const p = this._drawPreview;
        if (parseFloat(p.getAttribute('width'))  < 4 ||
            parseFloat(p.getAttribute('height')) < 4) { this._cancelDraw(); return; }

        const el = document.createElementNS(this.SVG_NS, 'rect');
        ['x','y','width','height'].forEach(a => el.setAttribute(a, p.getAttribute(a)));
        this._commitElement(el);
    },

    // ── ELLIPSE ───────────────────────────────────────────────
    _ellipseStart(pt) {
        this._drawState = {
            before: this._captureFullState(),
            cx: pt.x, cy: pt.y,
        };
        const el = this._makePreview('ellipse');
        el.setAttribute('cx', pt.x); el.setAttribute('cy', pt.y);
        el.setAttribute('rx', '0');  el.setAttribute('ry', '0');
    },

    _ellipseMove(pt) {
        if (!this._drawPreview || !this._drawState) return;
        const rx = Math.abs(pt.x - this._drawState.cx);
        const ry = Math.abs(pt.y - this._drawState.cy);
        this._drawPreview.setAttribute('rx', rx);
        this._drawPreview.setAttribute('ry', ry);
    },

    _ellipseEnd() {
        if (!this._drawState) return;
        const p = this._drawPreview;
        if (parseFloat(p.getAttribute('rx')) < 2 ||
            parseFloat(p.getAttribute('ry')) < 2) { this._cancelDraw(); return; }

        const el = document.createElementNS(this.SVG_NS, 'ellipse');
        ['cx','cy','rx','ry'].forEach(a => el.setAttribute(a, p.getAttribute(a)));
        this._commitElement(el);
    },

    // ── POLYGON (click vertices, dblclick to close) ───────────
    _polygonClick(pt) {
        if (!this._drawState) {
            this._drawState = {
                before: this._captureFullState(),
                points: [pt],
            };
            const el = this._makePreview('polyline');
            el.setAttribute('points', `${pt.x},${pt.y}`);
        } else {
            this._drawState.points.push(pt);
            const pts = this._drawState.points.map(p => `${p.x},${p.y}`).join(' ');
            this._drawPreview.setAttribute('points', pts);
        }
    },

    _polygonClose() {
        if (!this._drawState || this._drawState.points.length < 3) {
            this._cancelDraw(); return;
        }
        const el = document.createElementNS(this.SVG_NS, 'polygon');
        el.setAttribute('points',
            this._drawState.points.map(p => `${p.x},${p.y}`).join(' ')
        );
        this._commitElement(el);
    },

    // ── TEXT ──────────────────────────────────────────────────
    _textPlace(pt) {
        const before = this._captureFullState();
        const NS = this.SVG_NS;

        const el = document.createElementNS(NS, 'text');
        el.setAttribute('x', pt.x);
        el.setAttribute('y', pt.y);
        el.setAttribute('font-family', 'Inter, sans-serif');
        el.setAttribute('font-size',   '14');
        el.setAttribute('fill',         this._drawStyle.stroke);
        el.textContent = 'Text';
        el.id = `el_${Date.now()}_${Math.floor(Math.random()*9999)}`;
        this._contentRoot.appendChild(el);

        this.pushHistory('Text', before, this._captureFullState());
        this.selectEl(el);
        this._refreshPropertyPanel();
        // Immediately open edit in property panel
        setTimeout(() => this._startInlineTextEdit(el), 50);
    },

    _startInlineTextEdit(textEl) {
        // Focus text content input in property panel
        const $input = $('#prop-text-content');
        if ($input.length) {
            $input.val(textEl.textContent).trigger('focus').trigger('select');
        }
    },

    // ── WIRE (Manhattan routing + Smooth Trace toggle) ────────
    _wireStart(pt) {
        this._drawState = {
            before: this._captureFullState(),
            x1: pt.x, y1: pt.y,
        };
        const el = this._makePreview('path');
        el.setAttribute('d', `M ${pt.x} ${pt.y} L ${pt.x} ${pt.y}`);
        el.setAttribute('stroke', this._drawStyle.stroke || '#4facfe');
        el.setAttribute('stroke-width', '2');
        el.setAttribute('fill', 'none');
    },

    _wireMove(pt) {
        if (!this._drawPreview || !this._drawState) return;
        const { x1, y1 } = this._drawState;
        const d = this._smoothTrace
            ? `M ${x1} ${y1} L ${pt.x} ${pt.y}`
            : `M ${x1} ${y1} L ${x1} ${pt.y} L ${pt.x} ${pt.y}`;  // Manhattan
        this._drawPreview.setAttribute('d', d);
    },

    _wireEnd() {
        if (!this._drawState) return;
        const d = this._drawPreview.getAttribute('d');
        if (!d || d.length < 10) { this._cancelDraw(); return; }

        const el = document.createElementNS(this.SVG_NS, 'path');
        el.setAttribute('d', d);
        el.setAttribute('fill', 'none');
        el.classList.add('wire-group');
        this._commitElement(el);
    },
});
