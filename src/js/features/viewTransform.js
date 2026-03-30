/* ============================================================
   SVG Wiring Editor — View Transform  (Bug-fix pass)
   – Fix #6: wheel zoom at cursor position (not center)
   – Fix #2: drag only moves when in select mode / no draw tool active
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Setters ──────────────────────────────────────────────

    setZoom(zoom) {
        this.currentZoom = zoom;
        this.$zoomSlider.val(zoom);
        $('#zoomValue').text(zoom.toFixed(1));
        this.updateTransform();
    },

    setRotation(rotation) {
        this.currentRotation = rotation % 360;
        this.$rotationSlider.val(this.currentRotation);
        $('#rotationValue').text(Math.round(this.currentRotation));
        this.updateTransform();
    },

    setPitch(pitch) {
        this.currentPitch = pitch;
        this.$pitchSlider.val(pitch);
        $('#pitchValue').text(Math.round(pitch));
        this.updateTransform();
    },

    setYRotation(yaw) {
        this.currentYaw = yaw;
        this.$rotateYSlider.val(yaw);
        $('#rotateYValue').text(Math.round(yaw));
        this.updateTransform();
    },

    // ── Transform Computation ────────────────────────────────
    //   Applied to #svgWrapper (the inner div), NOT the container.
    //   Origin is always top-left (0 0) so zoom-at-point math works.

    updateTransform() {
        const t = [
            `translate(${this.currentTranslate.x}px, ${this.currentTranslate.y}px)`,
            `scale(${this.currentZoom})`,
            `rotateZ(${this.currentRotation}deg)`,
            `skewX(${this.currentPitch}deg)`,
            `rotateY(${this.currentYaw}deg)`,
        ].join(' ');

        this.$svgWrapper.css({
            'transform':        t,
            'transform-origin': '0 0',   // ← critical: top-left origin
            'transform-style':  'preserve-3d',
        });
    },

    // ── rAF scheduler: batches pending transform state ────────
    //   Call _scheduleTransform(state) instead of updateTransform()
    //   directly during continuous events (drag, wheel).
    _scheduleTransform(state) {
        Object.assign(this, state);          // write pending state immediately
        if (this._transformRafHandle) return; // already queued
        this._transformRafHandle = requestAnimationFrame(() => {
            this._transformRafHandle = null;
            this.updateTransform();
        });
    },

    updateSliders() {
        this.$zoomSlider.val(this.currentZoom);
        this.$rotationSlider.val(this.currentRotation);
        this.$pitchSlider.val(this.currentPitch);
        $('#zoomValue').text(this.currentZoom.toFixed(1));
        $('#rotationValue').text(Math.round(this.currentRotation));
        $('#pitchValue').text(Math.round(this.currentPitch));
    },

    // ── Animated Actions ─────────────────────────────────────

    animateZoom(targetZoom) {
        gsap.to(this, {
            duration: 0.35,
            ease:     'power2.out',
            currentZoom: targetZoom,
            onUpdate:    () => this.setZoom(this.currentZoom),
        });
    },

    zoomIn()  { this.animateZoom(Math.min(100, this.currentZoom * 1.5)); },
    zoomOut() { this.animateZoom(Math.max(0.1, this.currentZoom / 1.5)); },

    fitToView() {
        const svgEl = this.$svgDisplay[0];
        const ctnr  = this.$svgContainer[0];
        if (!svgEl || !ctnr) return;

        // Try to compute natural SVG dimensions from viewBox
        const vb = svgEl.getAttribute('viewBox');
        let svgW = svgEl.getAttribute('width')  ? parseFloat(svgEl.getAttribute('width'))  : 0;
        let svgH = svgEl.getAttribute('height') ? parseFloat(svgEl.getAttribute('height')) : 0;
        if (vb) {
            const parts = vb.split(/[\s,]+/).map(Number);
            if (parts.length === 4) { svgW = parts[2]; svgH = parts[3]; }
        }

        const cW = ctnr.clientWidth;
        const cH = ctnr.clientHeight;

        let targetZoom = 1;
        if (svgW > 0 && svgH > 0) {
            targetZoom = Math.min(cW / svgW, cH / svgH) * 0.92;
        }

        const targetTx = (cW - svgW * targetZoom) / 2;
        const targetTy = (cH - svgH * targetZoom) / 2;

        gsap.to(this, {
            duration: 0.6,
            ease:     'power2.inOut',
            currentZoom:        targetZoom,
            currentRotation:    0,
            currentPitch:       0,
            currentYaw:         0,
            onUpdate: () => {
                this.currentTranslate = {
                    x: this.currentTranslate.x + (targetTx - this.currentTranslate.x) * 0.1,
                    y: this.currentTranslate.y + (targetTy - this.currentTranslate.y) * 0.1,
                };
                this.setZoom(this.currentZoom);
                this.setRotation(this.currentRotation);
            },
            onComplete: () => {
                this.currentTranslate = { x: targetTx, y: targetTy };
                this.updateTransform();
                this.updateSliders();
            },
        });
    },

    rotateView() {
        const target = (this.currentRotation + 90) % 360;
        gsap.to(this, {
            duration: 0.6, ease: 'power2.inOut', currentRotation: target,
            onUpdate: () => this.setRotation(this.currentRotation),
        });
    },

    rotateViewLeft() {
        const target = (this.currentRotation - 90 + 360) % 360;
        gsap.to(this, {
            duration: 0.6, ease: 'power2.inOut', currentRotation: target,
            onUpdate: () => this.setRotation(this.currentRotation),
        });
    },

    resetView() {
        gsap.to(this, {
            duration: 0.6, ease: 'power2.inOut',
            currentZoom: 1, currentRotation: 0, currentPitch: 0, currentYaw: 0,
            onUpdate: () => {
                this.currentTranslate = { x: 0, y: 0 };
                this.setZoom(this.currentZoom);
                this.setRotation(this.currentRotation);
            },
            onComplete: () => {
                this.currentTranslate = { x: 0, y: 0 };
                this.updateTransform();
            },
        });
        this.clearAllHighlights?.();
        this.isWireTracing = false;
        $('#traceWireBtn').removeClass('active');
    },

    // ── Mouse Drag ───────────────────────────────────────────

    startDrag(event) {
        // Only pan when no draw tool is active (draw tools handle their own events)
        if (this.activeTool !== 'select') return;
        this.isDragging = true;
        this.dragStart = {
            x:         event.clientX,
            y:         event.clientY,
            translate: { ...this.currentTranslate },
            rotation:  this.currentRotation,
            pitch:     this.currentPitch,
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
        } else if (event.ctrlKey) {
            this._scheduleTransform({ currentPitch: Math.max(-60, Math.min(60, this.dragStart.pitch + dX * 0.4)) });
        } else {
            this._scheduleTransform({
                currentTranslate: {
                    x: this.dragStart.translate.x + dX,
                    y: this.dragStart.translate.y + dY,
                },
            });
        }
    },

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.$svgContainer.css('cursor', this.activeTool === 'select' ? 'grab' : 'default');
    },

    // ── Fix #6: Wheel Zoom AT cursor position ─────────────────

    handleWheel(event) {
        event.preventDefault();
        const e       = event.originalEvent || event;
        const factor  = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.1, Math.min(100, this.currentZoom * factor));

        const ctnrRect = this.$svgContainer[0].getBoundingClientRect();
        const mx = e.clientX - ctnrRect.left;
        const my = e.clientY - ctnrRect.top;

        // Zoom-at-point: keep the content pixel under the cursor fixed
        const ratio = newZoom / this.currentZoom;
        this._scheduleTransform({
            currentZoom:      newZoom,
            currentTranslate: {
                x: mx - ratio * (mx - this.currentTranslate.x),
                y: my - ratio * (my - this.currentTranslate.y),
            },
        });
        // Update slider label eagerly (cheap text write)
        this.$zoomSlider?.val(newZoom);
        $('#zoomValue').text(newZoom.toFixed(1));
    },

    handleOrientationChange() {
        setTimeout(() => {
            this.updateTransform();
            this.updateMiniMap?.();
        }, 100);
    },
});
