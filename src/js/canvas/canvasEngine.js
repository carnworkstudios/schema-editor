/* ============================================================
   Schematics Editor — Canvas Engine
   Selection manager, bounding-box handles, drag-move,
   resize (8 handles), rotate, delete, group/ungroup
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Init ──────────────────────────────────────────────────
    initCanvasEngine() {
        this._selection = [];        // array of SVG elements
        this._selectionBox = null;      // <g> overlay with handles
        this._dragState = null;      // drag operation state
        this._resizeState = null;      // resize operation state
        this._rotateState = null;      // rotate operation state
        this._useCanvasHandles = false; // set true in initCameraOverlay once overlay ready

        this._bindCanvasEvents();
        this.initCameraOverlay();
    },

    // ── Canvas overlay init (Step 3) ────────────────────────────────
    //   Sized to match #svgDisplay; re-sized on ResizeObserver.
    //   Not drawing yet — rendering wired in Steps 7–10.
    initCameraOverlay() {
        this._overlayCanvas = document.getElementById('overlayCanvas');
        if (!this._overlayCanvas) return;
        this._overlayCtx = this._overlayCanvas.getContext('2d');
        this._overlayHandleZones = [];
        this._overlayRafHandle = null;
        this._resizeOverlayCanvas();
        const ro = new ResizeObserver(() => this._resizeOverlayCanvas());
        ro.observe(this.$svgDisplay[0]);
        // Enable canvas-based handle rendering
        this._useCanvasHandles = true;
    },

    _resizeOverlayCanvas() {
        if (!this._overlayCanvas) return;
        const r = this.$svgDisplay[0].getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this._overlayCanvas.width = r.width * dpr;
        this._overlayCanvas.height = r.height * dpr;
        this._overlayCanvas.style.width = r.width + 'px';
        this._overlayCanvas.style.height = r.height + 'px';
        // setTransform resets — do NOT use ctx.scale() which accumulates on each resize
        this._overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._scheduleOverlayRender();
    },

    _scheduleOverlayRender() {
        if (!this._overlayCtx) return;
        if (this._overlayRafHandle) return;
        this._overlayRafHandle = requestAnimationFrame(() => {
            this._overlayRafHandle = null;
            this._renderOverlay();
        });
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
            } catch (_) { }
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
        const NS = this.SVG_NS;
        const g = document.createElementNS(NS, 'g');
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
    //   Canvas-only handles. SVGs scale infinitely, handles stay pixel-perfect.

    _renderHandles() {
        this._removeHandles();
        this._scheduleOverlayRender();
    },

    _removeHandles() {
        this._selectionBox?.remove();
        this._selectionBox = null;
        this.$svgDisplay[0].querySelectorAll('.selection-handle-group').forEach(el => el.remove());
    },

    // ── Step 7: World → Overlay screen coords ─────────────────
    //   Uses getScreenCTM() — provably correct once CSS transforms
    //   are removed from #svgWrapper; always agrees with SVG rendering.
    _worldToOverlayScreen(wx, wy) {
        const svg = this.$svgDisplay[0];
        // Subtract the canvas's own screen origin so handle coords are canvas-relative.
        // Using the canvas rect (not svgContainer) is the canonical reference because
        // handles are painted onto the canvas element itself.
        const canvasRect = this._overlayCanvas.getBoundingClientRect();
        const rotGrp = svg.querySelector('#_cameraRotGroup');
        const pt = svg.createSVGPoint();
        pt.x = wx; pt.y = wy;
        // _cameraRotGroup.getScreenCTM() maps from document-local space → screen,
        // correctly including the camera rotation applied to that group.
        // svg.getScreenCTM() maps from SVG root space → screen (wrong when rotated).
        const m = rotGrp ? rotGrp.getScreenCTM() : svg.getScreenCTM();
        const sp = pt.matrixTransform(m);
        return { x: sp.x - canvasRect.left, y: sp.y - canvasRect.top };
    },

    // ── Step 7: Canvas overlay rendering ─────────────────────
    _renderOverlay() {
        if (!this._overlayCtx) return;
        const ctx = this._overlayCtx;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, this._overlayCanvas.width / dpr, this._overlayCanvas.height / dpr);
        this._overlayHandleZones = [];
        if (!this._selection?.length) return;

        const bb = this._getSelectionBBoxWorld();
        if (!bb) return;

        const pad = 4;
        const bx = bb.x - pad, by = bb.y - pad;
        const bw = bb.width + pad * 2, bh = bb.height + pad * 2;

        // Project the 4 bbox corners to overlay screen coords via getScreenCTM()
        const tl = this._worldToOverlayScreen(bx, by);
        const tr = this._worldToOverlayScreen(bx + bw, by);
        const bl = this._worldToOverlayScreen(bx, by + bh);
        const br = this._worldToOverlayScreen(bx + bw, by + bh);

        this._drawOverlayRect(ctx, [tl, tr, br, bl]);
        this._drawOverlayHandles(ctx, tl, tr, bl, br);
        this._drawOverlayRotHandle(ctx, tl, tr);
    },

    _drawOverlayRect(ctx, pts) {
        ctx.save();
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    },

    _drawOverlayHandles(ctx, tl, tr, bl, br) {
        const midT = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
        const midB = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
        const midL = { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };
        const midR = { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
        const zones = [
            { id: 'nw', ...tl }, { id: 'n', ...midT }, { id: 'ne', ...tr },
            { id: 'e', ...midR }, { id: 'se', ...br }, { id: 's', ...midB },
            { id: 'sw', ...bl }, { id: 'w', ...midL },
        ];
        const SZ = 10;
        ctx.save();
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 1.5;
        zones.forEach(z => {
            ctx.fillRect(z.x - SZ / 2, z.y - SZ / 2, SZ, SZ);
            ctx.strokeRect(z.x - SZ / 2, z.y - SZ / 2, SZ, SZ);
            this._overlayHandleZones.push({ type: 'rect', id: z.id, cx: z.x, cy: z.y, size: SZ });
        });
        ctx.restore();
    },

    _drawOverlayRotHandle(ctx, tl, tr) {
        const mx = (tl.x + tr.x) / 2;
        const my = (tl.y + tr.y) / 2;
        // Direction perpendicular to top edge (pointing away from shape)
        const ex = tr.x - tl.x, ey = tr.y - tl.y;
        const len = Math.hypot(ex, ey) || 1;
        const nx = -ey / len, ny = ex / len;  // perpendicular outward
        const arm = 24;
        const hx = mx + nx * arm;
        const hy = my + ny * arm;
        ctx.save();
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this._overlayHandleZones.push({ type: 'circle', id: 'rotate', cx: hx, cy: hy, r: 8 });
    },

    // ── Step 8: CSS-agnostic bbox in world space ──────────────
    //   Pure SVG-transform walk — no getCTM(), no CSS dependency.
    //   Works correctly through _cameraRotGroup and nested groups.
    _getSelectionBBoxWorld() {
        if (!this._selection.length) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const svg = this.$svgDisplay[0];

        this._selection.forEach(el => {
            let bb;
            try { bb = el.getBBox(); } catch (_) { return; }
            if (!bb) return;

            // Walk SVG transform chain from element up to _cameraRotGroup (exclusive).
            // Stop before _cameraRotGroup so bbox coords stay in document-local space —
            // the same space where element transform= attributes are interpreted.
            // (Including _cameraRotGroup's rotate would shift the bbox into SVG root
            // space, causing rotate/scale handles to operate around the wrong origin.)
            let m = new DOMMatrix();
            let node = el;
            while (node && node !== svg && node.id !== '_cameraRotGroup') {
                const tv = node.transform?.baseVal;
                if (tv?.length) {
                    const lm = tv.consolidate()?.matrix;
                    if (lm) m = new DOMMatrix([lm.a, lm.b, lm.c, lm.d, lm.e, lm.f]).multiply(m);
                }
                node = node.parentElement;
            }

            [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]]
                .forEach(([px, py]) => {
                    const tp = new DOMPoint(px, py).matrixTransform(m);
                    minX = Math.min(minX, tp.x); minY = Math.min(minY, tp.y);
                    maxX = Math.max(maxX, tp.x); maxY = Math.max(maxY, tp.y);
                });
        });

        if (!isFinite(minX)) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },

    // Alias for any existing callers that use the old name
    _getSelectionBBox() { return this._getSelectionBBoxWorld(); },

    // ── Step 10: Handle hit-testing on canvas overlay ────────
    //   Canvas has no per-element pointer events; we maintain
    //   this._overlayHandleZones to detect hits manually.
    _hitTestOverlayHandles(clientX, clientY) {
        const ctnr = this._overlayCanvas.getBoundingClientRect();
        const sx = clientX - ctnr.left, sy = clientY - ctnr.top;
        for (const z of (this._overlayHandleZones || [])) {
            if (z.type === 'circle') {
                if (Math.hypot(sx - z.cx, sy - z.cy) <= z.r) return z.id;
            } else {
                const hs = z.size / 2;
                if (sx >= z.cx - hs && sx <= z.cx + hs && sy >= z.cy - hs && sy <= z.cy + hs) return z.id;
            }
        }
        return null;
    },

    _startHandleInteraction(type, clientX, clientY) {
        const startX = clientX;
        const startY = clientY;
        const startBB = this._getSelectionBBoxWorld();
        if (!startBB) return;

        const startTransforms = this._selection.map(el => ({
            el,
            transform: el.getAttribute('transform') || '',
            attrs: this._captureElementAttrs(el),
        }));

        const before = this._captureFullState();

        const svgStart = this.screenToSVG(startX, startY);

        const onMove = (ev) => {
            const svgNow = this.screenToSVG(ev.clientX, ev.clientY);
            const dx = svgNow.x - svgStart.x;
            const dy = svgNow.y - svgStart.y;

            if (type === 'rotate') {
                const cx = startBB.x + startBB.width / 2;
                const cy = startBB.y + startBB.height / 2;
                const startAngle = Math.atan2(svgStart.y - cy, svgStart.x - cx) * 180 / Math.PI;
                let delta = Math.atan2(svgNow.y - cy, svgNow.x - cx) * 180 / Math.PI - startAngle;
                // Normalize to [-180,180] to avoid jumps at the ±180 boundary
                delta -= 360 * Math.round(delta / 360);
                const snapped = Math.round(delta / 15) * 15;
                this._applyRotation(startTransforms, cx, cy, snapped);
            } else {
                this._applyResize(startTransforms, startBB, type, dx, dy, ev.shiftKey);
            }
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
        // Anchor: the bbox corner that stays fixed (opposite the dragged handle).
        const ax = handle.includes('w') ? startBB.x + startBB.width : startBB.x;
        const ay = handle.includes('n') ? startBB.y + startBB.height : startBB.y;

        // Compose world-space scale-about-anchor with the element's original transform.
        // translate(ax,ay) scale(sx,sy) translate(-ax,-ay) origT  is mathematically:
        //   newWorldMatrix = scaleAboutAnchor * originalWorldMatrix
        // This preserves any existing rotation or offset in origT (palette symbols, etc.)
        startTransforms.forEach(({ el, transform: origT }) => {
            el.setAttribute('transform',
                `translate(${ax},${ay}) scale(${sx},${sy}) translate(${-ax},${-ay}) ${origT}`
            );
        });
    },

    _applyRotation(startTransforms, cx, cy, angle) {
        // Prepend a world-space rotation to the element's original transform (captured at
        // drag-start).  Using a delta angle keeps rotations from accumulating over multiple
        // drag sessions — each session composes a fresh delta on top of origT.
        startTransforms.forEach(({ el, transform: origT }) => {
            el.setAttribute('transform', `rotate(${angle},${cx},${cy}) ${origT}`);
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

    // Bidirectional resize cursors per handle id.  'rotate' uses crosshair.
    _HANDLE_CURSORS: {
        nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
        e:  'ew-resize',   se: 'nwse-resize', s:  'ns-resize',
        sw: 'nesw-resize', w: 'ew-resize',
        rotate: 'crosshair',
    },

    _bindCanvasEvents() {
        // Cursor update on hover — changes to resize/rotate cursor over overlay handles
        this.$svgDisplay.on('mousemove.canvasCursor', (e) => {
            if (this.activeTool !== 'select' || !this._useCanvasHandles) return;
            const handleId = this._hitTestOverlayHandles(e.clientX, e.clientY);
            const cursor = handleId ? (this._HANDLE_CURSORS[handleId] || 'default') : '';
            this.$svgContainer[0].style.cursor = cursor;
        });

        // Click on canvas — select element or deselect
        this.$svgDisplay.on('mousedown.canvas', (e) => {
            if (this.activeTool !== 'select') return;

            // Step 10: Canvas handle hit-test check
            if (this._useCanvasHandles) {
                const handleId = this._hitTestOverlayHandles(e.clientX, e.clientY);
                if (handleId) {
                    e.stopPropagation();
                    e.preventDefault();
                    this._startHandleInteraction(handleId, e.clientX, e.clientY);
                    return;
                }
            }

            const target = e.target;
            const ignored = ['svg', 'svgDisplay', '_gridLayer', '_gridDefs'];
            const isIgnored = ignored.includes(target.id) || target.tagName.toLowerCase() === 'svg' ||
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

            if (el.id === '_gridLayer' || el.id === 'svgDisplay' || el.tagName.toLowerCase() === 'svg') {
                this.deselectAll();
                return;
            }

            // Walk up to the parent domain-symbol group so the whole
            // component (with its translate transform) gets selected
            const symGroup = el.closest('.domain-symbol');
            if (symGroup) el = symGroup;

            e.stopPropagation();
            this.selectEl(el, e.shiftKey || e.ctrlKey || e.metaKey);

            // Execute Trace mode simultaneously if active
            if (this.isWireTracing) {
                const wire = this.wires?.find(w =>
                    w.element === el || w.$hitbox?.[0] === el || w.$group?.[0] === el);
                if (wire) this.traceWirePath(wire);
                else {
                    const comp = this.components?.find(c =>
                        c.element === el || c.$hitbox?.[0] === el || c.$group?.[0] === el);
                    if (comp) this.traceComponent(comp);
                }
            }

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
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
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

    /** Capture a lightweight snapshot: just the attributes of every SVG element.
     *  _cameraRotGroup is excluded: its transform= is camera state, not document state.
     *  Including it would make Ctrl+Z un-rotate the view rather than undo an edit. */
    _captureFullState() {
        const els = {};
        this.$svgDisplay[0].querySelectorAll('[id]').forEach(el => {
            if (el.id === '_cameraRotGroup') return;  // Step 9: camera state ≠ doc state
            if (!el.id) return;
            const attrs = {};
            for (const a of el.attributes) attrs[a.name] = a.value;
            els[el.id] = { tag: el.tagName, attrs, parentId: el.parentElement?.id || '' };
        });
        return JSON.stringify(els);
    },

    /** Restore from a snapshot: apply attribute diffs only, no innerHTML teardown.
     *  _cameraRotGroup is skipped so undo never un-rotates the view. */
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
        // Remove elements not in snapshot (but preserve _cameraRotGroup)
        svg.querySelectorAll('[id]').forEach(el => {
            if (el.id === '_cameraRotGroup') return;  // Step 9: never restore camera state
            if (!state[el.id]) el.remove();
        });
        // Apply attribute diffs
        Object.entries(state).forEach(([id, { tag, attrs, parentId }]) => {
            if (id === '_cameraRotGroup') return;  // camera state, skip
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

        this._selection = [];
        this._selectionBox = null;
    },
});
