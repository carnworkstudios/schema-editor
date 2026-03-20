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

    _triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    exportCurrentView() {
        const svgData = new XMLSerializer().serializeToString(this.$svgDisplay[0]);
        this._triggerDownload(svgData, 'wiring_diagram.svg', 'image/svg+xml;charset=utf-8');
        this.showToast('SVG exported', 'success');
    },

    exportAsHtml() {
        const svgData = new XMLSerializer().serializeToString(this.$svgDisplay[0]);
        const title = this.displays[this.activeDisplayIdx]?.name || 'Wiring Diagram';
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; background: #111; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${svgData}
</body>
</html>`;
        const base = title.replace(/\.[^.]+$/, '');
        this._triggerDownload(html, `${base}.html`, 'text/html;charset=utf-8');
        this.showToast('HTML exported', 'success');
    },

    exportAsJson() {
        const svgEl = this.$svgDisplay[0];
        const vb = svgEl.getAttribute('viewBox') || '';
        const name = this.displays[this.activeDisplayIdx]?.name || 'diagram';

        const serializeEl = (el) => {
            const attrs = {};
            for (const attr of el.attributes) attrs[attr.name] = attr.value;
            const children = Array.from(el.children).map(serializeEl);
            return {
                tag: el.tagName.toLowerCase(),
                attrs,
                text: el.children.length === 0 ? (el.textContent || undefined) : undefined,
                ...(children.length ? { children } : {}),
            };
        };

        const json = {
            name,
            viewBox: vb,
            elements: Array.from(svgEl.children).map(serializeEl),
            wires: this.wires.map(w => ({
                id: $(w.element || w.$element?.[0]).attr('id') || null,
                color: w.color || null,
            })),
            components: this.components.map(c => ({
                id: $(c.element || c.$element?.[0]).attr('id') || null,
                type: c.type || null,
                bbox: c.bbox || null,
            })),
        };

        const base = name.replace(/\.[^.]+$/, '');
        this._triggerDownload(JSON.stringify(json, null, 2), `${base}.json`, 'application/json');
        this.showToast('JSON exported', 'success');
    },

    batchExport() {
        if (!this.displays.length) {
            this.showToast('No diagrams loaded', 'error');
            return;
        }

        const saved = this.activeDisplayIdx;

        this.displays.forEach((display, idx) => {
            setTimeout(() => {
                const base = display.name.replace(/\.[^.]+$/, '');
                this._triggerDownload(display.svgContent, `${base}.svg`, 'image/svg+xml;charset=utf-8');
                if (idx === this.displays.length - 1) {
                    this.showToast(`${this.displays.length} SVG(s) exported`, 'success');
                    this.switchDisplay(saved);
                }
            }, idx * 300);
        });
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

        this._showMeasureModal();
    },

    _showMeasureModal() {
        const $modal = $('#measureModal');
        $modal.addClass('open');

        // Restore last-used state
        const unit = this._measureUnit || 'px';
        $modal.find('.measure-unit-btn').removeClass('active');
        $modal.find(`.measure-unit-btn[data-unit="${unit}"]`).addClass('active');
        $('#measurePxVal').val(this._measurePxVal || 1);
        $('#measureUnitVal').val(this._measureUnitVal || 1);

        const system = ['mm', 'cm', 'm'].includes(unit) ? 'metric' : (unit === 'px' ? 'px' : 'imperial');
        $modal.find('.measure-tab').removeClass('active');
        $modal.find(`.measure-tab[data-system="${system}"]`).addClass('active');
        $modal.find('.measure-unit-group').hide();
        $modal.find(`.measure-unit-group[data-system="${system}"]`).show();
        const showScale = system !== 'px';
        $('#measureScaleRow').toggle(showScale);
        if (showScale) $('#measureScaleUnitLabel').text(unit);
    },

    _startMeasuring() {
        this._measuring = true;
        this._measurePoints = [];
        this.showToast(`Measure ON — tap two points (${this._measureUnit})`, 'success');

        this.$svgDisplay.on('click.measure', (e) => {
            const rect = this.$svgDisplay[0].getBoundingClientRect();
            this._measurePoints.push({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });

            if (this._measurePoints.length === 2) {
                const [a, b] = this._measurePoints;
                const distPx = Math.hypot(b.x - a.x, b.y - a.y);

                let result;
                if (this._measureUnit === 'px' || !this._measureScaleFactor) {
                    result = `${distPx.toFixed(1)} px`;
                } else {
                    const converted = (distPx * this._measureScaleFactor).toFixed(3);
                    result = `${converted} ${this._measureUnit}`;
                }

                this.showToast(`Distance: ${result}`, 'success');
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
