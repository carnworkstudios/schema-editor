/* ============================================================
   SVG Wiring Editor — UI Controls Feature
   Side panel, bottom controls, dark mode, export, toast,
   loading indicator, mini-map, measure tool
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    // ── Side Panel ───────────────────────────────────────────

    toggleSidePanel() {
        this.$sidePanel.toggleClass('open');
    },

    closeSidePanel() {
        this.$sidePanel.removeClass('open');
    },

    // ── Bottom Controls Toggle ───────────────────────────────

    toggleBottomControls() {
        this.$bottomControls.toggleClass('expanded');
    },

    // ── Dark Mode ────────────────────────────────────────────

    toggleDarkMode() {
        const isDark = $('body').toggleClass('dark-mode').hasClass('dark-mode');
        $('#darkModeBtn iconify-icon').attr('icon',
            isDark ? 'material-symbols:light-mode-outline' : 'material-symbols:dark-mode-outline'
        );
        this.showToast(isDark ? 'Dark mode' : 'Light mode', 'success');
    },

    // ── Export ───────────────────────────────────────────────

    exportCurrentView() {
        const svgData = new XMLSerializer().serializeToString(this.$svgDisplay[0]);
        const blob    = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url     = URL.createObjectURL(blob);
        const link    = document.createElement('a');
        link.href     = url;
        link.download = 'wiring_diagram_view.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showToast('View exported', 'success');
    },

    // ── Measure Tool ─────────────────────────────────────────

    toggleMeasureTool() {
        if (this._measuring) {
            this._measuring = false;
            this._measurePoints = [];
            this.$svgDisplay.off('click.measure');
            this.showToast('Measure tool OFF', 'success');
            return;
        }

        this._measuring = true;
        this._measurePoints = [];
        this.showToast('Measure ON — tap two points', 'success');

        this.$svgDisplay.on('click.measure', (e) => {
            const rect = this.$svgDisplay[0].getBoundingClientRect();
            this._measurePoints.push({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });

            if (this._measurePoints.length === 2) {
                const [a, b] = this._measurePoints;
                const dist = Math.hypot(b.x - a.x, b.y - a.y).toFixed(1);
                this.showToast(`Distance: ${dist}px`, 'success');
                this._measurePoints = [];
            } else {
                this.showToast('Point 1 marked — tap second point', 'success');
            }
        });
    },

    // ── Mini Map ─────────────────────────────────────────────

    toggleMiniMap() {
        this.miniMapVisible = !this.miniMapVisible;
        this.$miniMap.toggleClass('visible', this.miniMapVisible);
        if (this.miniMapVisible) this.updateMiniMap();
    },

    updateMiniMap() {
        if (!this.miniMapVisible) return;
        const clone = this.$svgDisplay.clone();
        clone.removeAttr('id').find('*').removeAttr('id');
        this.$miniMapSvg.empty().append(clone);
        this.$miniMapViewport.css({ width: '20%', height: '20%', left: '40%', top: '40%' });
    },

    // ── Toast ────────────────────────────────────────────────

    showToast(message, type = 'success') {
        this.$toast.removeClass('show success error').addClass(type);
        this.$toast.text(message).addClass('show');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => this.$toast.removeClass('show'), 3000);
    },

    // ── Loading Indicator ────────────────────────────────────

    showLoading(show) {
        $('#loadingIndicator').toggle(show);
    },
});
