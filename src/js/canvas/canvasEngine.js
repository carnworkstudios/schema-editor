/* ============================================================
   Schematics Editor — Canvas Engine
   Selection manager, bounding-box handles, drag-move,
   resize (8 handles), rotate, delete, group/ungroup
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Init ──────────────────────────────────────────────────
    initCanvasEngine() {
        this._selection    = [];        // array of SVG elements
        this._selectionBox = null;      // <g> overlay with handles
        this._dragState    = null;      // drag operation state
        this._resizeState  = null;      // resize operation state
        this._rotateState  = null;      // rotate operation state

        this._bindCanvasEvents();
    },

    // ── Selection API ─────────────────────────────────────────

    getSelection() { return [...this._selection]; },

    selectEl(svgEl, additive = false) {
        if (!svgEl) return;
        if (!additive) {
            this._selection.forEach(el => el.classList.remove('se-selected'));
            this._selection = [];
        }
        if (!this._selection.includes(svgEl)) {
            this._selection.push(svgEl);
            svgEl.classList.add('se-selected');
        }
        this._renderHandles();
        this._refreshPropertyPanel();
    },

    selectAll() {
        this._selection.forEach(el => el.classList.remove('se-selected'));
        this._selection = [];
        this.$svgDisplay.find('*').not(
            '#_gridLayer, #_gridDefs, defs, .snap-guide, .draw-preview, ' +
            '.selection-handle-group, .selection-handle, .rotation-handle'
        ).each((_, el) => {
            try {
                const bb = el.getBBox();
                if (bb.width > 0 || bb.height > 0) {
                    this._selection.push(el);
                    el.classList.add('se-selected');
                }
            } catch (_) {}
        });
        this._renderHandles();
        this._refreshPropertyPanel();
    },

    deselectAll() {
        this._selection.forEach(el => el.classList.remove('se-selected'));
        this._selection = [];
        this._removeHandles();
        this._clearPropertyPanel();
    },

    deleteSelected() {
        if (!this._selection.length) return;
        const before = this._captureFullState();
        this._selection.forEach(el => el.remove());
        this._selection = [];
        this._removeHandles();
        const after = this._captureFullState();
        this.pushHistory('Delete', before, after);
        this.showToast('Deleted', 'success');
    },

    // ── Group / Ungroup ───────────────────────────────────────

    groupSelected() {
        if (this._selection.length < 2) {
            this.showToast('Select 2+ elements to group', 'error');
            return;
        }
        const before = this._captureFullState();
        const NS  = this.SVG_NS;
        const g   = document.createElementNS(NS, 'g');
        g.id = `group_${Date.now()}`;
        const parent = this._selection[0].parentNode;
        parent.insertBefore(g, this._selection[0]);
        this._selection.forEach(el => g.appendChild(el));
        const after = this._captureFullState();
        this.pushHistory('Group', before, after);
        this.selectEl(g);
        this.showToast('Grouped', 'success');
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
    },

    ungroupSelected() {
        const groups = this._selection.filter(el => el.tagName.toLowerCase() === 'g');
        if (!groups.length) { this.showToast('No groups selected', 'error'); return; }
        const before = this._captureFullState();
        const newSel = [];
        groups.forEach(g => {
            const parent = g.parentNode;
            Array.from(g.children).forEach(child => {
                parent.insertBefore(child, g);
                newSel.push(child);
            });
            g.remove();
        });
        const after = this._captureFullState();
        this.pushHistory('Ungroup', before, after);
        this._selection = [];
        newSel.forEach(el => this.selectEl(el, true));
        this.showToast('Ungrouped', 'success');
        if (typeof this.buildLayersTree === 'function') this.buildLayersTree();
    },

    // ── Selection Handles ─────────────────────────────────────

    _renderHandles() {
        this._removeHandles();
        if (!this._selection.length) return;

        const NS  = this.SVG_NS;
        const svg = this.$svgDisplay[0];
        const bb  = this._getSelectionBBox();
        if (!bb) return;

        const pad = 4;
        const x  = bb.x - pad, y = bb.y - pad;
        const w  = bb.width  + pad * 2;
        const h  = bb.height + pad * 2;

        const grp = document.createElementNS(NS, 'g');
        grp.classList.add('selection-handle-group');
        grp.setAttribute('pointer-events', 'none');

        // Dashed selection rect
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width',  String(w));
        rect.setAttribute('height', String(h));
        rect.classList.add('selection-rect');
        rect.setAttribute('pointer-events', 'none');
        grp.appendChild(rect);

        // 8 resize handles
        const positions = [
            { id: 'nw', cx: x,       cy: y       },
            { id: 'n',  cx: x + w/2, cy: y       },
            { id: 'ne', cx: x + w,   cy: y       },
            { id: 'e',  cx: x + w,   cy: y + h/2 },
            { id: 'se', cx: x + w,   cy: y + h   },
            { id: 's',  cx: x + w/2, cy: y + h   },
            { id: 'sw', cx: x,       cy: y + h   },
            { id: 'w',  cx: x,       cy: y + h/2 },
        ];

        positions.forEach(({ id, cx, cy }) => {
            const h = document.createElementNS(NS, 'rect');
            h.setAttribute('x', String(cx - 5));
            h.setAttribute('y', String(cy - 5));
            h.setAttribute('width',  '10');
            h.setAttribute('height', '10');
            h.setAttribute('rx', '2');
            h.classList.add('selection-handle');
            h.setAttribute('data-handle', id);
            h.setAttribute('pointer-events', 'all');
            grp.appendChild(h);
        });

        // Rotation handle
        const rotLine = document.createElementNS(NS, 'line');
        rotLine.setAttribute('x1', String(x + w/2));
        rotLine.setAttribute('y1', String(y));
        rotLine.setAttribute('x2', String(x + w/2));
        rotLine.setAttribute('y2', String(y - 24));
        rotLine.classList.add('rotation-line');
        rotLine.setAttribute('pointer-events', 'none');
        grp.appendChild(rotLine);

        const rotHandle = document.createElementNS(NS, 'circle');
        rotHandle.setAttribute('cx', String(x + w/2));
        rotHandle.setAttribute('cy', String(y - 28));
        rotHandle.setAttribute('r', '6');
        rotHandle.classList.add('rotation-handle');
        rotHandle.setAttribute('data-handle', 'rotate');
        rotHandle.setAttribute('pointer-events', 'all');
        grp.appendChild(rotHandle);

        svg.appendChild(grp);
        this._selectionBox = grp;

        // Bind handle interactions
        this._bindHandleEvents(grp, bb, x, y, w, h);
    },

    _removeHandles() {
        this._selectionBox?.remove();
        this._selectionBox = null;
        this.$svgDisplay[0].querySelectorAll('.selection-handle-group').forEach(el => el.remove());
    },

    _getSelectionBBox() {
        if (!this._selection.length) return null;
        let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        this._selection.forEach(el => {
            // Prefer BBox map cache (no reflow) → fall back to live getBBox()
            const cached = this._bboxMap?.get(el.id);
            const bb     = cached ?? (() => { try { return el.getBBox(); } catch(_){} return null; })();
            if (!bb) return;
            minX = Math.min(minX, bb.x);          minY = Math.min(minY, bb.y);
            maxX = Math.max(maxX, bb.x + bb.width); maxY = Math.max(maxY, bb.y + bb.height);
        });
        if (!isFinite(minX)) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },

    // ── Handle drag interactions ──────────────────────────────

    _bindHandleEvents(grp, origBB, bx, by, bw, bh) {
        const handles = grp.querySelectorAll('.selection-handle, .rotation-handle');

        handles.forEach(handle => {
            let startX, startY, startBB, startTransforms;

            const onMouseDown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const type = handle.getAttribute('data-handle');
                startX = e.clientX;
                startY = e.clientY;
                startBB = this._getSelectionBBox();
                startTransforms = this._selection.map(el => ({
                    el,
                    transform: el.getAttribute('transform') || '',
                    attrs: this._captureElementAttrs(el),
                }));

                const before = this._captureFullState();

                const onMove = (ev) => {
                    const svgStart = this.screenToSVG(startX, startY);
                    const svgNow   = this.screenToSVG(ev.clientX, ev.clientY);
                    const dx = svgNow.x - svgStart.x;
                    const dy = svgNow.y - svgStart.y;

                    if (type === 'rotate') {
                        const cx = startBB.x + startBB.width  / 2;
                        const cy = startBB.y + startBB.height / 2;
                        const angle = Math.atan2(svgNow.y - cy, svgNow.x - cx) * 180 / Math.PI + 90;
                        const snapped = Math.round(angle / 15) * 15;
                        this._applyRotation(startTransforms, cx, cy, snapped);
                    } else {
                        this._applyResize(startTransforms, startBB, type, dx, dy, ev.shiftKey);
                    }
                    // rAF-gated handle redraw — don't call _renderHandles() directly
                    if (!this._handleRafPending) {
                        this._handleRafPending = true;
                        requestAnimationFrame(() => {
                            this._handleRafPending = false;
                            this._renderHandles();
                        });
                    }
                };

                const onUp = () => {
                    $(document).off('mousemove.handle mouseup.handle');
                    const after = this._captureFullState();
                    this.pushHistory(type === 'rotate' ? 'Rotate' : 'Resize', before, after);
                    this._refreshPropertyPanel();
                };

                $(document).on('mousemove.handle', onMove).on('mouseup.handle', onUp);
            };

            handle.addEventListener('mousedown', onMouseDown);
        });
    },

    _captureElementAttrs(el) {
        const attrs = {};
        for (const attr of el.attributes) attrs[attr.name] = attr.value;
        return attrs;
    },

    _applyResize(startTransforms, startBB, handle, dx, dy, lockAspect) {
        const scaleX = handle.includes('e') ? (startBB.width + dx) / (startBB.width || 1)
                     : handle.includes('w') ? (startBB.width - dx) / (startBB.width || 1)
                     : 1;
        const scaleY = handle.includes('s') ? (startBB.height + dy) / (startBB.height || 1)
                     : handle.includes('n') ? (startBB.height - dy) / (startBB.height || 1)
                     : 1;
        const sx = Math.max(0.01, lockAspect ? Math.min(scaleX, scaleY) : scaleX);
        const sy = Math.max(0.01, lockAspect ? Math.min(scaleX, scaleY) : scaleY);
        const tx = handle.includes('w') ? startBB.x + startBB.width  * (1 - sx) : startBB.x;
        const ty = handle.includes('n') ? startBB.y + startBB.height * (1 - sy) : startBB.y;

        startTransforms.forEach(({ el }) => {
            const cx = startBB.x + startBB.width  / 2;
            const cy = startBB.y + startBB.height / 2;
            el.setAttribute('transform',
                `translate(${tx + (lockAspect ? 0 : 0)},${ty}) scale(${sx},${sy}) translate(${-startBB.x},${-startBB.y})`
            );
        });
    },

    _applyRotation(startTransforms, cx, cy, angle) {
        startTransforms.forEach(({ el, transform }) => {
            const existing = transform.replace(/rotate\([^)]*\)/g, '').trim();
            el.setAttribute('transform', `${existing} rotate(${angle},${cx},${cy})`);
        });
    },

    // ── Move Selected ─────────────────────────────────────────

    _startMoveSelected(startClientX, startClientY) {
        if (!this._selection.length) return;
        const before = this._captureFullState();
        const svgStart = this.screenToSVG(startClientX, startClientY);
        const origTransforms = this._selection.map(el => el.getAttribute('transform') || '');

        const onMove = (ev) => {
            const svgNow = this.screenToSVG(ev.clientX, ev.clientY);
            const raw = { x: svgNow.x - svgStart.x, y: svgNow.y - svgStart.y };
            const snapped = this.snapPoint(raw.x, raw.y);
            this._removeSnapGuides();
            const pt = this.smartSnap(svgNow.x, svgNow.y, this._selection.map(el => el.id));
            if (this._grid.snapOn) this.showSnapGuides(pt.x, pt.y);

            this._selection.forEach((el, i) => {
                const base = origTransforms[i];
                el.setAttribute('transform', `translate(${snapped.x},${snapped.y}) ${base}`);
            });
            this._renderHandles();
        };

        const onUp = () => {
            $(document).off('mousemove.move mouseup.move');
            this._removeSnapGuides();
            const after = this._captureFullState();
            this.pushHistory('Move', before, after);
            this._refreshPropertyPanel();
        };

        $(document).on('mousemove.move', onMove).on('mouseup.move', onUp);
    },

    // ── Canvas Event Binding ──────────────────────────────────

    _bindCanvasEvents() {
        // Click on canvas — select element or deselect
        this.$svgDisplay.on('mousedown.canvas', (e) => {
            if (this.activeTool !== 'select') return;

            const target = e.target;
            const ignored = ['svg', '_gridLayer', '_gridDefs'];
            const isIgnored = ignored.includes(target.id) ||
                target.classList.contains('snap-guide') ||
                target.classList.contains('draw-preview') ||
                target.closest('.selection-handle-group');

            if (isIgnored && !target.closest('.selection-handle-group')) {
                this.deselectAll();
                return;
            }

            if (target.closest('.selection-handle-group')) return; // handled by handle events

            // Find the real element (not hitbox wrapper)
            let el = target;
            if (el.classList.contains('wire-hitbox') || el.classList.contains('component-hitbox')) {
                el = el.previousElementSibling || el;
            }

            if (el.id === '_gridLayer') { this.deselectAll(); return; }

            e.stopPropagation();
            this.selectEl(el, e.shiftKey || e.ctrlKey || e.metaKey);

            if (this._selection.includes(el)) {
                this._startMoveSelected(e.clientX, e.clientY);
            }
        });

        // Arrow key nudge
        $(document).on('keydown.canvas', (e) => {
            if (this.activeTool !== 'select') return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!this._selection.length) return;

            const step = e.shiftKey ? 10 : 1;
            let dx = 0, dy = 0;
            if (e.key === 'ArrowLeft')  dx = -step;
            if (e.key === 'ArrowRight') dx =  step;
            if (e.key === 'ArrowUp')    dy = -step;
            if (e.key === 'ArrowDown')  dy =  step;
            if (!dx && !dy) return;

            e.preventDefault();
            const before = this._captureFullState();
            this._selection.forEach(el => {
                const t = el.getAttribute('transform') || '';
                el.setAttribute('transform', `translate(${dx},${dy}) ${t}`);
            });
            this._renderHandles();
            const after = this._captureFullState();
            this.pushHistory('Nudge', before, after);
            this._refreshPropertyPanel();
        });
    },

    // ── Per-command attribute diff history (replaces full innerHTML) ───

    /** Capture a lightweight snapshot: just the attributes of every SVG element. */
    _captureFullState() {
        const els = {};
        this.$svgDisplay[0].querySelectorAll('*').forEach(el => {
            if (!el.id) return;
            const attrs = {};
            for (const a of el.attributes) attrs[a.name] = a.value;
            els[el.id] = { tag: el.tagName, attrs, parentId: el.parentElement?.id || '' };
        });
        return JSON.stringify(els);
    },

    /** Restore from a snapshot: apply attribute diffs only, no innerHTML teardown. */
    _restoreFullState(snapshot) {
        let state;
        try { state = JSON.parse(snapshot); } catch (_) {
            // Legacy innerHTML restore path (old history entries)
            this.$svgDisplay[0].innerHTML = snapshot;
            this._selection = [];
            this._selectionBox = null;
            if (typeof this.analyzeWiringDiagram === 'function') this.analyzeWiringDiagram();
            return;
        }

        const svg = this.$svgDisplay[0];
        // Remove elements not in snapshot
        svg.querySelectorAll('[id]').forEach(el => {
            if (!state[el.id]) el.remove();
        });
        // Apply attribute diffs
        Object.entries(state).forEach(([id, { tag, attrs, parentId }]) => {
            let el = svg.querySelector(`#${CSS.escape(id)}`);
            if (!el) {
                el = document.createElementNS(this.SVG_NS, tag);
                el.id = id;
                const parent = parentId ? (svg.querySelector(`#${CSS.escape(parentId)}`) || svg) : svg;
                parent.appendChild(el);
            }
            // Sync attributes
            const existing = new Set(Array.from(el.attributes).map(a => a.name));
            Object.entries(attrs).forEach(([k, v]) => { el.setAttribute(k, v); existing.delete(k); });
            existing.forEach(k => el.removeAttribute(k));
        });

        this._selection    = [];
        this._selectionBox = null;
    },
});
