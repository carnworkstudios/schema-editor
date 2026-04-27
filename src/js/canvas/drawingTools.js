/* ============================================================
   Schematics Editor — Drawing Tools
   Pen, Line, Rectangle, Ellipse, Polygon, Text
   Each tool: preview on drag → commit on mouseup/dblclick
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Tool activation ───────────────────────────────────────
    initDrawingTools() {
        this._drawState = null;   // active draw operation
        this._drawPreview = null;   // ghost/preview element

        // Default style for new elements
        this._drawStyle = {
            stroke: '#4facfe',
            strokeWidth: '2',
            fill: 'none',
            fillOpacity: '1',
            strokeDasharray: 'none',
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
            select: 'default',
            pen: 'crosshair',
            line: 'crosshair',
            rect: 'crosshair',
            ellipse: 'crosshair',
            polygon: 'crosshair',
            text: 'text',
            wire: 'crosshair',
        };
        this.$svgContainer.css('cursor', cursors[tool] || 'default');

        // If leaving draw mode, cancel any in-progress draw
        if (!['pen', 'line', 'rect', 'ellipse', 'polygon', 'text', 'wire'].includes(tool)) {
            this._cancelDraw();
        }

        // Toggle select-mode canvas listener
        if (tool === 'select') {
            this.$svgContainer.css('cursor', 'default');
        }

        this.showToast(
            {
                select: 'Select', pen: 'Pen', line: 'Line', rect: 'Rectangle',
                ellipse: 'Ellipse', polygon: 'Polygon', text: 'Text', wire: 'Wire'
            }[tool] + ' tool',
            'success'
        );
    },

    // ── Main draw event binding ───────────────────────────────
    _bindDrawEvents() {
        this.$svgContainer.on('mousedown.draw', (e) => {
            const drawTools = ['pen', 'line', 'rect', 'ellipse', 'polygon', 'text', 'wire'];
            if (!drawTools.includes(this.activeTool)) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            const pt = this.screenToSVG(e.clientX, e.clientY);
            const snapped = this.smartSnap(pt.x, pt.y);

            switch (this.activeTool) {
                case 'pen': this._penStart(snapped, e); break;
                case 'line': this._lineStart(snapped); break;
                case 'rect': this._rectStart(snapped); break;
                case 'ellipse': this._ellipseStart(snapped); break;
                case 'polygon': this._polygonClick(snapped); break;
                case 'text': this._textPlace(snapped); break;
                case 'wire': this._wireClick(snapped); break;
            }
        });

        $(document).on('mousemove.draw', (e) => {
            if (!this._drawState) return;
            const pt = this.screenToSVG(e.clientX, e.clientY);
            const snapped = this.smartSnap(pt.x, pt.y);

            switch (this.activeTool) {
                case 'pen': this._penMove(snapped, e); break;
                case 'line': this._lineMove(snapped); break;
                case 'rect': this._rectMove(snapped); break;
                case 'ellipse': this._ellipseMove(snapped); break;
                case 'wire': this._wireMove(snapped); break;
            }
        });

        $(document).on('mouseup.draw', (e) => {
            if (!this._drawState) return;

            switch (this.activeTool) {
                case 'pen': this._penEnd(); break;
                case 'line': this._lineEnd(); break;
                case 'rect': this._rectEnd(); break;
                case 'ellipse': this._ellipseEnd(); break;
                // wire: click-to-commit; no action on mouseup (committed by dblclick/Enter)
            }
        });

        // Double-click: finish polygon or commit wire
        this.$svgContainer.on('dblclick.draw', (e) => {
            if (!this._drawState) return;
            e.preventDefault();
            if (this.activeTool === 'polygon') this._polygonClose();
            if (this.activeTool === 'wire')    this._wireCommit(e.clientX, e.clientY);
        });

        // Escape cancels; Enter commits; Backspace retracts last waypoint
        $(document).on('keydown.draw', (e) => {
            if (!this._drawState) return;
            if (e.key === 'Escape') { e.preventDefault(); this._cancelDraw(); }
            if (e.key === 'Enter' && this.activeTool === 'wire') { e.preventDefault(); this._wireCommit(); }
            if (e.key === 'Backspace' && this.activeTool === 'wire' && this._drawState.points?.length > 1) {
                e.preventDefault();
                this._drawState.points.pop();
                this._drawState.pinTo = null;
                this._clearPinSnap();
                const d = this._wirePathFromPoints(this._drawState.points);
                this._drawPreview?.setAttribute('d', d);
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
        el.id = `el_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        this._applyDrawStyle(el);
        // Tag lines/wires as geo wires in electrical mode for live GeoEngine analysis
        if (this.activeMode === 'electrical') {
            const wireTools = new Set(['pen', 'line', 'wire']);
            el.setAttribute('data-geo-class', wireTools.has(this.activeTool) ? 'wire' : 'component');
        }
        this._contentRoot.appendChild(el);
        const after = this._captureFullState();
        this.pushHistory('Draw', this._drawState?.before || '', after);
        this._drawState = null;
        this.selectEl(el);
        this._refreshPropertyPanel();
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
        if (typeof this._scheduleGeoAnalysis === 'function') this._scheduleGeoAnalysis();
        return el;
    },

    _cancelDraw() {
        this._drawPreview?.remove();
        this._drawPreview = null;
        this._drawState = null;
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
            const x = (pts[i].x + pts[i + 1].x) / 2;
            const y = (pts[i].y + pts[i + 1].y) / 2;
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
        this._drawPreview.setAttribute('width', w);
        this._drawPreview.setAttribute('height', h);
    },

    _rectEnd() {
        if (!this._drawState) return;
        const p = this._drawPreview;
        if (parseFloat(p.getAttribute('width')) < 4 ||
            parseFloat(p.getAttribute('height')) < 4) { this._cancelDraw(); return; }

        const el = document.createElementNS(this.SVG_NS, 'rect');
        ['x', 'y', 'width', 'height'].forEach(a => el.setAttribute(a, p.getAttribute(a)));
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
        el.setAttribute('rx', '0'); el.setAttribute('ry', '0');
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
        ['cx', 'cy', 'rx', 'ry'].forEach(a => el.setAttribute(a, p.getAttribute(a)));
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
        el.setAttribute('font-size', '14');
        el.setAttribute('fill', this._drawStyle.stroke);
        el.textContent = 'Text';
        el.id = `el_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
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

    // ── WIRE (click-to-commit, Manhattan routing, snap-to-port) ──
    //   Click: add waypoint.  Dblclick / Enter: commit.  Escape: cancel.
    //   _smoothTrace toggles Manhattan vs straight mid-draw without restart.
    _wireClick(pt) {
        const snapped = this._wireSnapToPort(pt);
        const pin = this._lastSnappedPin;
        const pinInfo = pin ? {
            symId: pin.closest('.domain-symbol')?.id ?? null,
            pinId: pin.dataset.pin ?? '0',
        } : null;

        if (!this._drawState) {
            // First click — start a new wire, record origin pin
            this._drawState = {
                before: this._captureFullState(),
                tool: 'wire',
                points: [snapped],
                pinFrom: pinInfo,
                pinTo: null,
            };
            const el = this._makePreview('path');
            el.setAttribute('d', `M ${snapped.x} ${snapped.y}`);
            el.setAttribute('stroke', this._drawStyle.stroke || '#4facfe');
            el.setAttribute('stroke-width', '2');
            el.setAttribute('fill', 'none');
        } else {
            // Subsequent clicks — add waypoint, update terminal pin (last click wins)
            this._drawState.points.push(snapped);
            this._drawState.pinTo = pinInfo;
            const d = this._wirePathFromPoints(this._drawState.points);
            this._drawPreview?.setAttribute('d', d);
        }
    },

    _wireMove(pt) {
        if (!this._drawPreview || !this._drawState) return;
        const snapped = this._wireSnapToPort(pt);
        const snapPin = this._lastSnappedPin;

        // Highlight pin being approached
        this._contentRoot?.querySelectorAll('.pin-point.pin-snap').forEach(p => {
            if (p !== snapPin) p.classList.remove('pin-snap');
        });
        if (snapPin) snapPin.classList.add('pin-snap');

        // Live preview: committed waypoints + ghost segment to cursor
        const d = this._wirePathFromPoints([...this._drawState.points, snapped]);
        this._drawPreview.setAttribute('d', d);
    },

    // clientX/Y supplied by dblclick handler; undefined when committed via Enter key.
    _wireCommit(clientX, clientY) {
        if (!this._drawState || !this._drawState.points || this._drawState.points.length < 2) {
            this._cancelDraw(); return;
        }
        const { points, pinFrom, pinTo } = this._drawState;
        const lastPt = points[points.length - 1];

        const d = this._wirePathFromPoints(points);
        const el = document.createElementNS(this.SVG_NS, 'path');
        el.setAttribute('d', d);
        el.setAttribute('fill', 'none');

        // Store pin-connection metadata so wires can follow symbols when dragged
        if (pinFrom?.symId) {
            el.setAttribute('data-from-sym', pinFrom.symId);
            el.setAttribute('data-from-pin', pinFrom.pinId);
        }
        if (pinTo?.symId) {
            el.setAttribute('data-to-sym', pinTo.symId);
            el.setAttribute('data-to-pin', pinTo.pinId);
        }

        this._commitElement(el);
        // T-junction: if the terminal point lands on another wire's body, split it
        this._checkWireTJunction?.(el, lastPt);
        this._clearPinSnap();

        // Only show picker when the terminal end is dangling (no symbol snapped)
        if (clientX != null && !pinTo?.symId) {
            this._showSymbolPicker(lastPt, el, clientX, clientY);
        }
    },

    // Build SVG path string from waypoints.  Manhattan mode reads _smoothTrace live
    // so toggling mid-draw immediately reflects in the preview.
    _wirePathFromPoints(pts) {
        if (!pts.length) return '';
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1], curr = pts[i];
            if (this._smoothTrace) {
                d += ` L ${curr.x} ${curr.y}`;
            } else {
                // Manhattan: horizontal-first elbow
                d += ` L ${prev.x} ${curr.y} L ${curr.x} ${curr.y}`;
            }
        }
        return d;
    },

    // Snap pt to a nearby .pin-point circle within 16 screen pixels (converted to SVG units
    // at the current zoom so snap radius feels constant regardless of zoom level).
    // Side-effect: sets this._lastSnappedPin to the matched DOM element (or null).
    _wireSnapToPort(pt) {
        const THRESHOLD = 16 / (this.zoom || 1);
        let best = null, bestDist = THRESHOLD, bestPin = null;
        this._contentRoot?.querySelectorAll('.pin-point').forEach(pin => {
            const cx = parseFloat(pin.getAttribute('cx') || 0);
            const cy = parseFloat(pin.getAttribute('cy') || 0);
            // Transform pin center to document-local space via its own CTM chain
            let m = new DOMMatrix();
            let node = pin;
            const svg = this.$svgDisplay[0];
            while (node && node !== svg && node.id !== '_cameraRotGroup') {
                const tv = node.transform?.baseVal;
                if (tv?.length) {
                    const lm = tv.consolidate()?.matrix;
                    if (lm) m = new DOMMatrix([lm.a, lm.b, lm.c, lm.d, lm.e, lm.f]).multiply(m);
                }
                node = node.parentElement;
            }
            const wp = new DOMPoint(cx, cy).matrixTransform(m);
            const dist = Math.hypot(wp.x - pt.x, wp.y - pt.y);
            if (dist < bestDist) { bestDist = dist; best = { x: wp.x, y: wp.y }; bestPin = pin; }
        });
        this._lastSnappedPin = bestPin;
        return best || pt;
    },

    _clearPinSnap() {
        this._contentRoot?.querySelectorAll('.pin-point.pin-snap').forEach(p => p.classList.remove('pin-snap'));
    },

    // ── Symbol picker popover (shown after wire commit to free endpoint) ──
    // seg2Ref is only supplied by _splitWireAtClick (insert-in-series feature):
    // when set, the chosen symbol's exit pin is also wired to seg2's start.
    _showSymbolPicker(svgPt, wirePath, clientX, clientY, seg2Ref = null) {
        let picker = document.getElementById('se-sym-picker');
        if (!picker) {
            picker = document.createElement('div');
            picker.id = 'se-sym-picker';
            picker.className = 'se-sym-picker';
            picker.innerHTML = `
                <div class="se-sym-picker-header">
                    <span class="se-sym-picker-title">Place symbol</span>
                    <input type="text" class="se-sym-picker-search" placeholder="Search…" autocomplete="off" />
                    <button class="se-sym-picker-close" title="Close (Esc)">×</button>
                </div>
                <div class="se-sym-picker-body"></div>
            `;
            document.body.appendChild(picker);
            picker.querySelector('.se-sym-picker-close').addEventListener('click', () => this._closeSymbolPicker());
            picker.querySelector('.se-sym-picker-search').addEventListener('input', (ev) => this._filterSymbolPicker(ev.target.value));
        }

        const body = picker.querySelector('.se-sym-picker-body');
        body.innerHTML = '';
        picker.querySelector('.se-sym-picker-search').value = '';

        const kit = this._domainKits?.[this.activeMode];
        if (!kit?.symbols?.length) return;

        const groups = {};
        kit.symbols.forEach(sym => {
            const g = sym.group || 'General';
            if (!groups[g]) groups[g] = [];
            groups[g].push(sym);
        });

        Object.entries(groups).forEach(([groupName, syms]) => {
            const label = document.createElement('div');
            label.className = 'se-sym-picker-group';
            label.textContent = groupName;
            body.appendChild(label);

            const row = document.createElement('div');
            row.className = 'se-sym-picker-row';
            syms.forEach(sym => {
                const vb = sym.previewViewBox || '0 0 65 52';
                const item = document.createElement('div');
                item.className = 'se-sym-picker-item';
                item.dataset.symId = sym.id;
                item.title = sym.label;
                item.innerHTML = `
                    <div class="se-sym-picker-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%">${sym.svgPreview}</svg>
                    </div>
                    <div class="se-sym-picker-label">${sym.label}</div>
                `;
                item.addEventListener('click', () => {
                    // Parse the symbol's own SVG to find its pin-point elements (local coords)
                    const symParser = new DOMParser();
                    const symDoc = symParser.parseFromString(
                        `<svg xmlns="http://www.w3.org/2000/svg">${sym.svgContent || sym.svgPreview}</svg>`,
                        'image/svg+xml'
                    );
                    const symPins = [...symDoc.querySelectorAll('.pin-point')];

                    let entryPinCx = 0, entryPinCy = 0, entryPinId = '0';
                    let chosen = symPins[0] || null;

                    if (symPins.length > 0) {
                        // Determine wire approach direction from its last two path coordinates
                        const wireD = wirePath?.getAttribute('d') || '';
                        const wPts = [...wireD.matchAll(/[ML]\s*([\d.eE+\-]+)[,\s]+([\d.eE+\-]+)/g)]
                            .map(m => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) }));

                        chosen = symPins[0];
                        if (wPts.length >= 2) {
                            // Approach vector: direction the wire was travelling into svgPt
                            const prev = wPts[wPts.length - 2];
                            const adx = prev.x - svgPt.x;
                            const ady = prev.y - svgPt.y;
                            // Pick the pin whose local offset most aligns with the approach direction
                            // (highest dot product = pin faces the incoming wire)
                            let bestDot = -Infinity;
                            symPins.forEach(p => {
                                const dot = adx * parseFloat(p.getAttribute('cx') || 0)
                                          + ady * parseFloat(p.getAttribute('cy') || 0);
                                if (dot > bestDot) { bestDot = dot; chosen = p; }
                            });
                        }

                        entryPinCx = parseFloat(chosen.getAttribute('cx') || 0);
                        entryPinCy = parseFloat(chosen.getAttribute('cy') || 0);
                        entryPinId = chosen.getAttribute('data-pin') ?? '0';
                    }

                    // Offset placement so the entry pin lands exactly on the wire endpoint
                    const placed = this._placeSymbol(sym, svgPt.x - entryPinCx, svgPt.y - entryPinCy);

                    // Link wire's open end directly — no setTimeout, _placeSymbol now returns the element
                    if (placed && wirePath) {
                        wirePath.setAttribute('data-to-sym', placed.id);
                        wirePath.setAttribute('data-to-pin', entryPinId);
                    }

                    // Split-insert: wire the exit pin to the second segment
                    if (placed && seg2Ref && symPins.length >= 2) {
                        const exitPin = symPins.find(p => p !== chosen) || symPins[symPins.length - 1];
                        const exitCx = parseFloat(exitPin.getAttribute('cx') || 0);
                        const exitCy = parseFloat(exitPin.getAttribute('cy') || 0);
                        const exitPinId = exitPin.getAttribute('data-pin') ?? String(symPins.indexOf(exitPin));
                        const exitWorldX = (svgPt.x - entryPinCx) + exitCx;
                        const exitWorldY = (svgPt.y - entryPinCy) + exitCy;
                        const seg2Coords = [...(seg2Ref.getAttribute('d') || '')
                            .matchAll(/[ML]\s*([\d.eE+\-]+)[,\s]+([\d.eE+\-]+)/g)]
                            .map(m => ({ x: parseFloat(m[1]), y: parseFloat(m[2]) }));
                        const seg2End = seg2Coords[seg2Coords.length - 1] || { x: exitWorldX + 60, y: exitWorldY };
                        seg2Ref.setAttribute('data-from-sym', placed.id);
                        seg2Ref.setAttribute('data-from-pin', exitPinId);
                        seg2Ref.setAttribute('d',
                            `M ${exitWorldX} ${exitWorldY} L ${exitWorldX} ${seg2End.y} L ${seg2End.x} ${seg2End.y}`);
                    }
                    this._closeSymbolPicker();
                });
                row.appendChild(item);
            });
            body.appendChild(row);
        });

        // Position near cursor, keep within viewport
        const W = 280, maxH = 360;
        const vw = window.innerWidth, vh = window.innerHeight;
        let left = clientX + 14, top = clientY - 16;
        if (left + W > vw - 8) left = clientX - W - 14;
        if (top + maxH > vh - 8) top = vh - maxH - 8;
        if (top < 8) top = 8;
        picker.style.cssText = `display:flex; left:${left}px; top:${top}px;`;

        // Outside-click → close
        const onOutside = (ev) => {
            if (!picker.contains(ev.target)) this._closeSymbolPicker();
        };
        picker._onOutside = onOutside;
        document.addEventListener('mousedown', onOutside, true);

        // Escape → close
        const onKey = (ev) => { if (ev.key === 'Escape') this._closeSymbolPicker(); };
        picker._onKey = onKey;
        document.addEventListener('keydown', onKey, true);

        setTimeout(() => picker.querySelector('.se-sym-picker-search')?.focus(), 40);
    },

    _filterSymbolPicker(query) {
        const picker = document.getElementById('se-sym-picker');
        if (!picker) return;
        const q = query.toLowerCase().trim();
        picker.querySelectorAll('.se-sym-picker-item').forEach(item => {
            item.style.display = (!q || item.title.toLowerCase().includes(q)) ? '' : 'none';
        });
        picker.querySelectorAll('.se-sym-picker-row').forEach(row => {
            const anyVisible = [...row.children].some(c => c.style.display !== 'none');
            const lbl = row.previousElementSibling;
            row.style.display = anyVisible ? '' : 'none';
            if (lbl?.classList.contains('se-sym-picker-group')) lbl.style.display = anyVisible ? '' : 'none';
        });
    },

    _closeSymbolPicker() {
        const picker = document.getElementById('se-sym-picker');
        if (!picker || picker.style.display === 'none') return;
        picker.style.display = 'none';
        if (picker._onOutside) { document.removeEventListener('mousedown', picker._onOutside, true); picker._onOutside = null; }
        if (picker._onKey)     { document.removeEventListener('keydown',   picker._onKey,     true); picker._onKey = null; }
    },
});
