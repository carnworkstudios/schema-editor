/* ============================================================
   SVG Wiring Editor — View Transform  (viewBox-based rendering)
   Zoom + pan use SVG viewBox for always-crisp vector rendering.
   Rotation uses _cameraRotGroup SVG transform (no CSS transforms)
   so getScreenCTM() stays correct at all zoom/pan/rotation values.
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Compute the base viewBox that fills the container ─────
    //    Called on init, on container resize, and after loading SVG.
    _computeBaseViewBox() {
        const svg = this.$svgDisplay[0];
        const container = this.$svgContainer[0];
        if (!svg || !container) return;

        // Original document viewBox (the "content area").
        // Prefer the stored snapshot over the live attribute — the live attribute can contain
        // corrupted overflow values if a previous updateTransform wrote bad numbers.
        const raw = (this.originalViewBox || svg.getAttribute('viewBox') || '0 0 1200 800').trim();
        const vb = raw.split(/[\s,]+/).map(Number);
        const vbOk = vb.length === 4 && vb.every(isFinite) && vb[2] > 0 && vb[3] > 0;
        const safe = vbOk ? vb : [0, 0, 1200, 800];
        this._origDocViewBox = { x: safe[0], y: safe[1], w: safe[2], h: safe[3] };

        const cW = container.clientWidth || 1;
        const cH = container.clientHeight || 1;
        const doc = this._origDocViewBox;
        const docAR = doc.w / doc.h;
        const containerAR = cW / cH;

        // Expand viewBox to match container aspect ratio → no letterboxing
        if (containerAR > docAR) {
            const newW = doc.h * containerAR;
            this._baseViewBox = {
                x: doc.x - (newW - doc.w) / 2,
                y: doc.y,
                w: newW,
                h: doc.h,
            };
        } else {
            const newH = doc.w / containerAR;
            this._baseViewBox = {
                x: doc.x,
                y: doc.y - (newH - doc.h) / 2,
                w: doc.w,
                h: newH,
            };
        }
    },

    // ── Setters ──────────────────────────────────────────────

    setZoom(zoom) {
        const z = Number(zoom);
        if (this._isViewportLocked()) {
            this.$zoomSlider.val(this.camera.zoom); // snap back
            return;
        }
        this.camera.setZoom(z);
        this.$zoomSlider.val(z);
        $('#zoomValue').text(z.toFixed(1));
        this.updateTransform();
    },

    setRotation(rotation) {
        let r = Number(rotation);
        if (this._isViewportLocked()) {
            this.$rotationSlider.val(this.currentRotation);
            return;
        }
        this.currentRotation = r % 360;
        this.$rotationSlider.val(this.currentRotation);
        $('#rotationValue').text(Math.round(this.currentRotation));
        this.updateTransform();
    },

    setPitch(pitch) {
        // Pitch (skewX CSS) removed — breaks getScreenCTM(). Kept as no-op for compat.
    },

    setYRotation(yaw) {
        // Yaw (rotateY CSS) removed — breaks getScreenCTM(). Kept as no-op for compat.
    },

    // ── Transform Computation ────────────────────────────────
    //   Zoom + pan → SVG viewBox  (crisp vector rendering at every zoom)
    //   3D effects → CSS transform on #svgWrapper (only when active)

    updateTransform() {
        const svg = this.$svgDisplay[0];
        if (!svg) return;

        if (!this._baseViewBox) this._computeBaseViewBox();
        const base = this._baseViewBox;
        if (!base) return;

        const container = this.$svgContainer[0];
        const cW = container.clientWidth || 1;
        const zoom = this.camera.zoom;
        const tx = this.camera.tx;
        const ty = this.camera.ty;

        // ── viewBox: zoom + pan (always crisp) ──────────────
        const vbW = base.w / zoom;
        const vbH = base.h / zoom;
        const svgPerPx = base.w / (zoom * cW);   // SVG units per screen pixel
        const vbX = base.x - tx * svgPerPx;
        const vbY = base.y - ty * svgPerPx;

        if (!isFinite(vbX) || !isFinite(vbY) || !isFinite(vbW) || !isFinite(vbH) || vbW <= 0 || vbH <= 0) {
            console.warn('[viewTransform] viewBox overflow — resetting camera', { zoom, tx, ty, vbX, vbY, vbW, vbH });
            this.camera.setState({ zoom: 1, tx: 0, ty: 0 });
            this._computeBaseViewBox();
            return;
        }

        svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

        // ── Rotation → _cameraRotGroup SVG transform (world-space, no CSS) ──
        // This keeps getScreenCTM() correct at all zoom/pan/rotation values.
        const rotGroup = svg.querySelector('#_cameraRotGroup');
        if (rotGroup) {
            const vb = this.camera.toViewBox(base, cW);
            const wx = vb.x + vb.w / 2;   // world center of current view
            const wy = vb.y + vb.h / 2;
            const deg = this.currentRotation;
            rotGroup.setAttribute('transform',
                deg !== 0 ? `rotate(${deg},${wx},${wy})` : '');
        }

        // ── Remove any CSS transform from #svgWrapper ─────────────
        // After this step, CSS transforms are gone; getScreenCTM() is authoritative.
        this.$svgWrapper.css({ transform: 'none', 'transform-style': 'flat' });

        // ── Trigger overlay re-render so handles move with the view ──
        this._scheduleOverlayRender?.();
    },

    // ── rAF scheduler: batches pending transform state ────────
    _scheduleTransform(state) {
        Object.assign(this, state);
        if (this._transformRafHandle) return;
        this._transformRafHandle = requestAnimationFrame(() => {
            this._transformRafHandle = null;
            this.updateTransform();
        });
    },

    updateSliders() {
        this.$zoomSlider.val(this.camera.zoom);
        this.$rotationSlider.val(this.currentRotation);
        this.$pitchSlider.val(0); // legacy
        $('#zoomValue').text(this.camera.zoom.toFixed(1));
        $('#rotationValue').text(Math.round(this.currentRotation));
        $('#pitchValue').text(0);
    },

    // ── Animated Actions ─────────────────────────────────────

    animateZoom(targetZoom) {
        if (this._isViewportLocked()) return;
        this._cameraTween.zoom = this.camera.zoom;
        gsap.to(this._cameraTween, {
            duration: 0.35,
            ease: 'power2.out',
            zoom: targetZoom,
            onUpdate: () => this.setZoom(this._cameraTween.zoom),
        });
    },

    zoomIn() { this.animateZoom(Math.min(100, this.camera.zoom * 1.5)); },
    zoomOut() { this.animateZoom(Math.max(0.1, this.camera.zoom / 1.5)); },

    fitToView() {
        if (this._isViewportLocked()) return;
        const container = this.$svgContainer[0];
        if (!container) return;

        // Use original document dimensions (not the dynamic viewBox)
        const doc = this._origDocViewBox || { x: 0, y: 0, w: 1200, h: 800 };
        const cW = container.clientWidth;
        const cH = container.clientHeight;

        const targetZoom = Math.min(cW / doc.w, cH / doc.h) * 0.92;
        const targetTx = (cW - doc.w * targetZoom) / 2;
        const targetTy = (cH - doc.h * targetZoom) / 2;

        this._cameraTween.zoom = this.camera.zoom;
        this._cameraTween.rot = this.currentRotation;
        this._cameraTween.tx = this.camera.tx;
        this._cameraTween.ty = this.camera.ty;

        gsap.to(this._cameraTween, {
            duration: 0.6,
            ease: 'power2.inOut',
            zoom: targetZoom,
            rot: 0,
            tx: targetTx,
            ty: targetTy,
            onUpdate: () => {
                this.camera.setPan(this._cameraTween.tx, this._cameraTween.ty);
                this.setZoom(this._cameraTween.zoom);
                this.setRotation(this._cameraTween.rot);
            },
            onComplete: () => {
                this.camera.setPan(targetTx, targetTy);
                this.updateTransform();
                this.updateSliders();
            },
        });
    },

    rotateView() {
        if (this._isViewportLocked()) return;
        const target = (this.currentRotation + 90) % 360;
        this._cameraTween.rot = this.currentRotation;
        gsap.to(this._cameraTween, {
            duration: 0.6, ease: 'power2.inOut', rot: target,
            onUpdate: () => this.setRotation(this._cameraTween.rot),
        });
    },

    rotateViewLeft() {
        if (this._isViewportLocked()) return;
        const target = (this.currentRotation - 90 + 360) % 360;
        this._cameraTween.rot = this.currentRotation;
        gsap.to(this._cameraTween, {
            duration: 0.6, ease: 'power2.inOut', rot: target,
            onUpdate: () => this.setRotation(this._cameraTween.rot),
        });
    },

    resetView() {
        this._cameraTween.zoom = this.camera.zoom;
        this._cameraTween.rot = this.currentRotation;
        this._cameraTween.tx = this.camera.tx;
        this._cameraTween.ty = this.camera.ty;

        gsap.to(this._cameraTween, {
            duration: 0.6, ease: 'power2.inOut',
            zoom: 1, rot: 0, tx: 0, ty: 0,
            onUpdate: () => {
                this.camera.setPan(this._cameraTween.tx, this._cameraTween.ty);
                this.setZoom(this._cameraTween.zoom);
                this.setRotation(this._cameraTween.rot);
            },
            onComplete: () => {
                this.camera.setPan(0, 0);
                this.updateTransform();
            },
        });
        this.clearAllHighlights?.();
        this.isWireTracing = false;
        $('#traceWireBtn').removeClass('active');
    },

    // ── Edit-mode check ─────────────────────────────────────
    //   When objects are selected the viewport is locked so
    //   drag / wheel / rotate act on the selection, not the
    //   canvas.  Hold Space to temporarily unlock viewport.

    _isViewportLocked() {
        return this._selection?.length > 0 && !this._spaceHeld;
    },

    // ── Mouse Drag ───────────────────────────────────────────

    startDrag(event) {
        if (this.activeTool !== 'select') return;
        if (this._isViewportLocked()) return;   // edit-mode: no viewport pan

        const target = event.target;
        const targetId = target.id || '';
        const isBackground = targetId === 'svgWrapper' || targetId === '_gridLayer' || targetId === 'svgContainer' || target.tagName.toLowerCase() === 'svg' || target.tagName.toLowerCase() === 'html';
        if (!isBackground) return;

        this.isDragging = true;
        this.dragStart = {
            x: event.clientX,
            y: event.clientY,
            tx: this.camera.tx,
            ty: this.camera.ty,
            rotation: this.currentRotation,
        };
        this.$svgContainer.css('cursor', 'grabbing');
    },

    drag(event) {
        if (!this.isDragging || this.activeTool !== 'select') return;

        const dX = event.clientX - this.dragStart.x;
        const dY = event.clientY - this.dragStart.y;

        if (event.shiftKey) {
            this._scheduleTransform({ currentRotation: (this.dragStart.rotation + dX * 0.4) % 360 });
            this.$rotationSlider?.val(this.currentRotation);
        } else {
            this.camera.setPan(this.dragStart.tx + dX, this.dragStart.ty + dY);
            this._scheduleTransform({});
        }
    },

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.$svgContainer.css('cursor', this.activeTool === 'select' ? 'grab' : 'default');
    },

    // ── Wheel Zoom at cursor position ────────────────────────

    handleWheel(event) {
        if (this._isViewportLocked()) return;   // edit-mode: no viewport zoom
        event.preventDefault();
        const e = event.originalEvent || event;
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.1, Math.min(100, this.camera.zoom * factor));
        const ctnr = this.$svgContainer[0].getBoundingClientRect();

        // Zoom-at-cursor via CameraMatrix (keeps world point under cursor fixed)
        this.camera.zoomAt(newZoom, e.clientX - ctnr.left, e.clientY - ctnr.top);

        this._scheduleTransform({});
        this.$zoomSlider?.val(newZoom);
        $('#zoomValue').text(newZoom.toFixed(1));
    },

    handleOrientationChange() {
        setTimeout(() => {
            this._computeBaseViewBox();
            this.updateTransform();
            this.updateMiniMap?.();
        }, 100);
    },
});
