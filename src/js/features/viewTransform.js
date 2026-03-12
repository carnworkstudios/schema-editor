/* ============================================================
   SVG Wiring Editor — View Transform Feature
   Zoom, pan, rotate, pitch/yaw, drag, wheel, sliders
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

    updateTransform() {
        const t = `
            translate(${this.currentTranslate.x}px, ${this.currentTranslate.y}px)
            scale(${this.currentZoom})
            rotateZ(${this.currentRotation}deg)
            skewX(${this.currentPitch}deg)
            rotateY(${this.currentYaw}deg)
        `;
        this.$svgWrapper.css({
            'transform': t,
            'transform-origin': 'center center',
            'transform-style': 'preserve-3d',
            'perspective': '1500px',
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
            duration: 0.45,
            ease: 'power2.out',
            currentZoom: targetZoom,
            onUpdate: () => this.setZoom(this.currentZoom),
        });
    },

    zoomIn() {
        this.animateZoom(Math.min(100, this.currentZoom * 1.5));
    },

    zoomOut() {
        this.animateZoom(Math.max(0.1, this.currentZoom / 1.5));
    },

    fitToView() {
        gsap.to(this, {
            duration: 0.8,
            ease: 'power2.inOut',
            currentZoom: 1,
            currentRotation: 0,
            onUpdate: () => {
                this.currentTranslate = { x: 0, y: 0 };
                this.setZoom(this.currentZoom);
                this.setRotation(this.currentRotation);
            },
        });
    },

    rotateView() {
        const target = (this.currentRotation + 90) % 360;
        gsap.to(this, {
            duration: 0.6,
            ease: 'power2.inOut',
            currentRotation: target,
            onUpdate: () => this.setRotation(this.currentRotation),
        });
    },

    rotateViewLeft() {
        const target = (this.currentRotation - 90 + 360) % 360;
        gsap.to(this, {
            duration: 0.6,
            ease: 'power2.inOut',
            currentRotation: target,
            onUpdate: () => this.setRotation(this.currentRotation),
        });
    },

    resetView() {
        gsap.to(this, {
            duration: 0.8,
            ease: 'power2.inOut',
            currentZoom: 1,
            currentRotation: 0,
            currentPitch: 0,
            currentYaw: 0,
            onUpdate: () => {
                this.currentTranslate = { x: 0, y: 0 };
                this.setZoom(this.currentZoom);
                this.setRotation(this.currentRotation);
            },
        });
        this.clearAllHighlights();
        this.isWireTracing = false;
        $('#traceWireBtn').removeClass('active');
    },

    // ── Mouse Drag ───────────────────────────────────────────

    startDrag(event) {
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
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.dragStart.x;
        const deltaY = event.clientY - this.dragStart.y;

        if (event.shiftKey) {
            this.setRotation(this.dragStart.rotation + deltaX * 0.4);
        } else if (event.ctrlKey) {
            this.setPitch(Math.max(-60, Math.min(60, this.dragStart.pitch + deltaX * 0.4)));
        } else {
            this.currentTranslate = {
                x: this.dragStart.translate.x + deltaX,
                y: this.dragStart.translate.y + deltaY,
            };
            this.updateTransform();
        }
    },

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.$svgContainer.css('cursor', 'grab');
    },

    // ── Wheel Zoom ───────────────────────────────────────────

    handleWheel(event) {
        event.preventDefault();
        const delta = event.originalEvent.deltaY;
        const factor = delta > 0 ? 0.9 : 1.1;
        this.setZoom(Math.max(0.1, Math.min(100, this.currentZoom * factor)));
    },

    handleOrientationChange() {
        setTimeout(() => {
            this.updateTransform();
            this.updateMiniMap();
        }, 100);
    },
});
