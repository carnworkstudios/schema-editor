/* ============================================================
   SVG Wiring Editor — View Transform  (viewBox-based rendering)
   Zoom + pan use SVG viewBox for always-crisp vector rendering.
   CSS transforms are only used for 3D effects (rotation, pitch, yaw).
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Compute the base viewBox that fills the container ─────
    //    Called on init, on container resize, and after loading SVG.
    _computeBaseViewBox() {
        const svg       = this.$svgDisplay[0];
        const container = this.$svgContainer[0];
        if (!svg || !container) return;

        // Original document viewBox (the "content area")
        const raw = (this.originalViewBox || svg.getAttribute('viewBox') || '0 0 1200 800');
        const vb  = raw.split(/[\s,]+/).map(Number);
        this._origDocViewBox = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };

        const cW = container.clientWidth  || 1;
        const cH = container.clientHeight || 1;
        const doc = this._origDocViewBox;
        const docAR       = doc.w / doc.h;
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
        if (this._isViewportLocked()) {
            this.$zoomSlider.val(this.currentZoom); // snap back
            return;
        }
        this.currentZoom = zoom;
        this.$zoomSlider.val(zoom);
        $('#zoomValue').text(zoom.toFixed(1));
        this.updateTransform();
    },

    setRotation(rotation) {
        if (this._isViewportLocked()) {
            this.$rotationSlider.val(this.currentRotation);
            return;
        }
        this.currentRotation = rotation % 360;
        this.$rotationSlider.val(this.currentRotation);
        $('#rotationValue').text(Math.round(this.currentRotation));
        this.updateTransform();
    },

    setPitch(pitch) {
        if (this._isViewportLocked()) {
            this.$pitchSlider.val(this.currentPitch);
            return;
        }
        this.currentPitch = pitch;
        this.$pitchSlider.val(pitch);
        $('#pitchValue').text(Math.round(pitch));
        this.updateTransform();
    },

    setYRotation(yaw) {
        if (this._isViewportLocked()) {
            this.$rotateYSlider.val(this.currentYaw);
            return;
        }
        this.currentYaw = yaw;
        this.$rotateYSlider.val(yaw);
        $('#rotateYValue').text(Math.round(yaw));
        this.updateTransform();
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
        const cW   = container.clientWidth  || 1;
        const zoom = this.currentZoom;
        const tx   = this.currentTranslate.x;
        const ty   = this.currentTranslate.y;

        // ── viewBox: zoom + pan (always crisp) ──────────────
        const vbW = base.w / zoom;
        const vbH = base.h / zoom;
        const svgPerPx = base.w / (zoom * cW);   // SVG units per screen pixel
        const vbX = base.x - tx * svgPerPx;
        const vbY = base.y - ty * svgPerPx;

        svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

        // ── CSS: 3D effects only (no scale or translate) ────
        const has3D = this.currentRotation !== 0 ||
                      this.currentPitch    !== 0 ||
                      this.currentYaw      !== 0;

        if (has3D) {
            this.$svgWrapper.css({
                'transform': [
                    `rotateZ(${this.currentRotation}deg)`,
                    `skewX(${this.currentPitch}deg)`,
                    `rotateY(${this.currentYaw}deg)`,
                ].join(' '),
                'transform-origin': '50% 50%',
                'transform-style':  'preserve-3d',
            });
        } else {
            this.$svgWrapper.css({
                'transform':       'none',
                'transform-style': 'flat',
            });
        }
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
        this.$zoomSlider.val(this.currentZoom);
        this.$rotationSlider.val(this.currentRotation);
        this.$pitchSlider.val(this.currentPitch);
        $('#zoomValue').text(this.currentZoom.toFixed(1));
        $('#rotationValue').text(Math.round(this.currentRotation));
        $('#pitchValue').text(Math.round(this.currentPitch));
    },

    // ── Animated Actions ─────────────────────────────────────

    animateZoom(targetZoom) {
        if (this._isViewportLocked()) return;
        gsap.to(this, {
            duration: 0.35,
            ease: 'power2.out',
            currentZoom: targetZoom,
            onUpdate: () => this.setZoom(this.currentZoom),
        });
    },

    zoomIn()  { this.animateZoom(Math.min(100, this.currentZoom * 1.5)); },
    zoomOut() { this.animateZoom(Math.max(0.1, this.currentZoom / 1.5)); },

    fitToView() {
        if (this._isViewportLocked()) return;
        const container = this.$svgContainer[0];
        if (!container) return;

        // Use original document dimensions (not the dynamic viewBox)
        const doc = this._origDocViewBox || { x: 0, y: 0, w: 1200, h: 800 };
        const cW  = container.clientWidth;
        const cH  = container.clientHeight;

        const targetZoom = Math.min(cW / doc.w, cH / doc.h) * 0.92;
        const targetTx   = (cW - doc.w * targetZoom) / 2;
        const targetTy   = (cH - doc.h * targetZoom) / 2;

        gsap.to(this, {
            duration: 0.6,
            ease: 'power2.inOut',
            currentZoom: targetZoom,
            currentRotation: 0,
            currentPitch: 0,
            currentYaw: 0,
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
        if (this._isViewportLocked()) return;
        const target = (this.currentRotation + 90) % 360;
        gsap.to(this, {
            duration: 0.6, ease: 'power2.inOut', currentRotation: target,
            onUpdate: () => this.setRotation(this.currentRotation),
        });
    },

    rotateViewLeft() {
        if (this._isViewportLocked()) return;
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
            translate: { ...this.currentTranslate },
            rotation: this.currentRotation,
            pitch: this.currentPitch,
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

    // ── Wheel Zoom at cursor position ────────────────────────

    handleWheel(event) {
        if (this._isViewportLocked()) return;   // edit-mode: no viewport zoom
        event.preventDefault();
        const e = event.originalEvent || event;
        const factor  = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.1, Math.min(100, this.currentZoom * factor));

        const ctnrRect = this.$svgContainer[0].getBoundingClientRect();
        const mx = e.clientX - ctnrRect.left;
        const my = e.clientY - ctnrRect.top;

        // Zoom-at-point: keep the SVG point under the cursor fixed
        const ratio = newZoom / this.currentZoom;
        this._scheduleTransform({
            currentZoom: newZoom,
            currentTranslate: {
                x: mx - ratio * (mx - this.currentTranslate.x),
                y: my - ratio * (my - this.currentTranslate.y),
            },
        });
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
