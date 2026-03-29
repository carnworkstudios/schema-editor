/* ============================================================
   Schematics Editor — Property Panel
   Inspect and live-edit style/position/size/text of selected SVG elements.
   Rendered inside the existing side panel as a second tab.
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    initPropertyPanel() {
        this._propPanelTarget = null;   // current selected element
        this._buildPropertyPanelHTML();
        this._bindPropertyPanelEvents();
    },

    // ── Build panel HTML ──────────────────────────────────────
    _buildPropertyPanelHTML() {
        const html = `
        <div id="propertyPanel" class="prop-panel" style="display:none;">
            <h3 class="prop-section-title">
                <iconify-icon icon="material-symbols:tune"></iconify-icon>
                Properties
            </h3>

            <!-- Element info -->
            <div class="prop-row prop-info-row">
                <span class="prop-label">Element</span>
                <span id="prop-el-tag" class="prop-value-tag">—</span>
            </div>

            <!-- Position -->
            <div class="prop-section-label">Position &amp; Size</div>
            <div class="prop-grid-2">
                <label class="prop-label">X
                    <input type="number" id="prop-x" class="prop-input" step="1">
                </label>
                <label class="prop-label">Y
                    <input type="number" id="prop-y" class="prop-input" step="1">
                </label>
                <label class="prop-label">W
                    <input type="number" id="prop-w" class="prop-input" step="1" min="0">
                </label>
                <label class="prop-label">H
                    <input type="number" id="prop-h" class="prop-input" step="1" min="0">
                </label>
            </div>

            <!-- Rotation -->
            <div class="prop-row">
                <label class="prop-label">Rotation
                    <input type="range" id="prop-rotation" class="prop-slider" min="-180" max="180" step="1" value="0">
                </label>
                <span id="prop-rotation-val" class="prop-pill">0°</span>
            </div>

            <!-- Stroke -->
            <div class="prop-section-label">Stroke</div>
            <div class="prop-grid-2">
                <label class="prop-label">Color
                    <div class="prop-color-wrap">
                        <input type="color" id="prop-stroke-color" class="prop-color" value="#4facfe">
                        <span id="prop-stroke-hex" class="prop-color-hex">#4facfe</span>
                    </div>
                </label>
                <label class="prop-label">Width
                    <input type="number" id="prop-stroke-width" class="prop-input" min="0" step="0.5" value="2">
                </label>
            </div>
            <div class="prop-row">
                <label class="prop-label">Dash
                    <select id="prop-stroke-dash" class="prop-select">
                        <option value="none">Solid</option>
                        <option value="4,4">Dashed</option>
                        <option value="2,4">Dotted</option>
                        <option value="8,4,2,4">Dash-dot</option>
                    </select>
                </label>
            </div>

            <!-- Fill -->
            <div class="prop-section-label">Fill</div>
            <div class="prop-grid-2">
                <label class="prop-label">Color
                    <div class="prop-color-wrap">
                        <input type="color" id="prop-fill-color" class="prop-color" value="#4facfe">
                        <span id="prop-fill-hex" class="prop-color-hex">#4facfe</span>
                    </div>
                </label>
                <label class="prop-label">Opacity
                    <input type="range" id="prop-fill-opacity" class="prop-slider" min="0" max="1" step="0.05" value="0">
                </label>
            </div>
            <div class="prop-row">
                <button class="btn prop-no-fill-btn" id="prop-no-fill">No Fill</button>
            </div>

            <!-- Text (shown only for <text> elements) -->
            <div id="prop-text-group" class="prop-section" style="display:none;">
                <div class="prop-section-label">Text</div>
                <textarea id="prop-text-content" class="prop-textarea" rows="2" placeholder="Text content…"></textarea>
                <div class="prop-grid-2">
                    <label class="prop-label">Size
                        <input type="number" id="prop-font-size" class="prop-input" min="6" step="1" value="14">
                    </label>
                    <label class="prop-label">Family
                        <select id="prop-font-family" class="prop-select">
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="monospace">Mono</option>
                            <option value="Georgia, serif">Serif</option>
                        </select>
                    </label>
                </div>
            </div>

            <!-- Border radius (shown for <rect>) -->
            <div id="prop-radius-group" class="prop-section" style="display:none;">
                <div class="prop-section-label">Corner Radius</div>
                <input type="range" id="prop-border-radius" class="prop-slider" min="0" max="50" step="1" value="0">
                <span id="prop-radius-val" class="prop-pill">0px</span>
            </div>

            <!-- Align & Distribute (shown when 2+ selected) -->
            <div id="prop-align-group" class="prop-section" style="display:none;">
                <div class="prop-section-label">Align</div>
                <div class="prop-align-row">
                    <button class="btn prop-align-btn" title="Align Left"       data-align="left">
                        <iconify-icon icon="material-symbols:align-horizontal-left"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Align Center H"   data-align="centerH">
                        <iconify-icon icon="material-symbols:align-horizontal-center"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Align Right"      data-align="right">
                        <iconify-icon icon="material-symbols:align-horizontal-right"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Align Top"        data-align="top">
                        <iconify-icon icon="material-symbols:align-vertical-top"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Align Center V"   data-align="centerV">
                        <iconify-icon icon="material-symbols:align-vertical-center"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Align Bottom"     data-align="bottom">
                        <iconify-icon icon="material-symbols:align-vertical-bottom"></iconify-icon>
                    </button>
                </div>
                <div class="prop-section-label" style="margin-top:8px;">Distribute</div>
                <div class="prop-align-row">
                    <button class="btn prop-align-btn" title="Distribute H" data-align="distH">
                        <iconify-icon icon="material-symbols:horizontal-distribute"></iconify-icon>
                    </button>
                    <button class="btn prop-align-btn" title="Distribute V" data-align="distV">
                        <iconify-icon icon="material-symbols:vertical-distribute"></iconify-icon>
                    </button>
                </div>
            </div>
        </div>`;

        // Append to side panel after layers panel
        const $sidePanel = $('#sidePanel');
        if ($sidePanel.find('#propertyPanel').length === 0) {
            $sidePanel.append(html);
        }
    },

    // ── Refresh from current selection ───────────────────────
    _refreshPropertyPanel() {
        const sel = this._selection;
        const el  = sel[0] || null;

        if (!el) { this._clearPropertyPanel(); return; }

        this._propPanelTarget = el;
        $('#propertyPanel').show();

        const tag = el.tagName.toLowerCase();
        $('#prop-el-tag').text(tag + (el.id ? `#${el.id.slice(0,12)}` : ''));

        // Position / size via bounding box
        try {
            const bb = el.getBBox();
            $('#prop-x').val(Math.round(bb.x));
            $('#prop-y').val(Math.round(bb.y));
            $('#prop-w').val(Math.round(bb.width));
            $('#prop-h').val(Math.round(bb.height));
        } catch (_) {}

        // Rotation from transform
        const transform = el.getAttribute('transform') || '';
        const rotMatch  = transform.match(/rotate\(([-\d.]+)/);
        const rotVal    = rotMatch ? parseFloat(rotMatch[1]) : 0;
        $('#prop-rotation').val(rotVal);
        $('#prop-rotation-val').text(`${Math.round(rotVal)}°`);

        // Stroke
        const stroke = el.getAttribute('stroke') || this._drawStyle.stroke;
        const sw     = el.getAttribute('stroke-width') || this._drawStyle.strokeWidth;
        const dash   = el.getAttribute('stroke-dasharray') || 'none';
        if (this._isValidColor(stroke)) {
            $('#prop-stroke-color').val(this._toHex(stroke));
            $('#prop-stroke-hex').text(this._toHex(stroke));
        }
        $('#prop-stroke-width').val(parseFloat(sw) || 2);
        $('#prop-stroke-dash').val(dash);

        // Fill
        const fill       = el.getAttribute('fill') || 'none';
        const fillOp     = parseFloat(el.getAttribute('fill-opacity') || '1');
        if (fill !== 'none' && this._isValidColor(fill)) {
            $('#prop-fill-color').val(this._toHex(fill));
            $('#prop-fill-hex').text(this._toHex(fill));
        }
        $('#prop-fill-opacity').val(fill === 'none' ? 0 : fillOp);

        // Text-specific
        const isText = tag === 'text' || tag === 'tspan';
        $('#prop-text-group').toggle(isText);
        if (isText) {
            $('#prop-text-content').val(el.textContent);
            $('#prop-font-size').val(parseFloat(el.getAttribute('font-size') || '14'));
            $('#prop-font-family').val(el.getAttribute('font-family') || 'Inter, sans-serif');
        }

        // Rect-specific
        const isRect = tag === 'rect';
        $('#prop-radius-group').toggle(isRect);
        if (isRect) {
            const rx = parseFloat(el.getAttribute('rx') || '0');
            $('#prop-border-radius').val(rx);
            $('#prop-radius-val').text(`${rx}px`);
        }

        // Align/distribute (multi-select)
        $('#prop-align-group').toggle(sel.length >= 2);

        // Ensure panel is open
        if (!$('#sidePanel').hasClass('open')) this.toggleSidePanel();
        // Switch to property tab
        this._switchSidePanelTab('properties');
    },

    _clearPropertyPanel() {
        $('#propertyPanel').hide();
        this._propPanelTarget = null;
    },

    // ── Side panel tab switching ──────────────────────────────
    _switchSidePanelTab(tab) {
        if (tab === 'properties') {
            $('#propertyPanel').show();
            $('#layersPanel').closest('.control-group').hide();
        } else {
            $('#propertyPanel').hide();
            $('#layersPanel').closest('.control-group').show();
        }
    },

    // ── Event binding ─────────────────────────────────────────
    _bindPropertyPanelEvents() {
        const self = this;

        // Live update helper
        const live = (selector, handler) => {
            $(document).on('input.prop change.prop', selector, function () {
                if (!self._propPanelTarget) return;
                handler.call(this, self._propPanelTarget);
                self._renderHandles();
            });
        };

        // Position inputs (use translate)
        live('#prop-x, #prop-y', function (el) {
            const x  = parseFloat($('#prop-x').val()) || 0;
            const y  = parseFloat($('#prop-y').val()) || 0;
            try {
                const bb = el.getBBox();
                const dx = x - bb.x;
                const dy = y - bb.y;
                const t  = el.getAttribute('transform') || '';
                el.setAttribute('transform', `translate(${dx},${dy}) ${t}`);
            } catch (_) {}
        });

        // Size inputs (scale)
        live('#prop-w, #prop-h', function (el) {
            const nw = parseFloat($('#prop-w').val()) || 1;
            const nh = parseFloat($('#prop-h').val()) || 1;
            try {
                const bb = el.getBBox();
                const sx = nw / (bb.width  || 1);
                const sy = nh / (bb.height || 1);
                const t  = el.getAttribute('transform') || '';
                el.setAttribute('transform',
                    `translate(${bb.x},${bb.y}) scale(${sx},${sy}) translate(${-bb.x},${-bb.y}) ${t}`
                );
            } catch (_) {}
        });

        // Rotation
        live('#prop-rotation', function (el) {
            const angle = parseFloat($(this).val()) || 0;
            $('#prop-rotation-val').text(`${Math.round(angle)}°`);
            try {
                const bb = el.getBBox();
                const cx = bb.x + bb.width  / 2;
                const cy = bb.y + bb.height / 2;
                const t  = (el.getAttribute('transform') || '').replace(/rotate\([^)]*\)/g, '').trim();
                el.setAttribute('transform', `${t} rotate(${angle},${cx},${cy})`);
            } catch (_) {}
        });

        // Stroke color
        live('#prop-stroke-color', function (el) {
            const val = $(this).val();
            el.setAttribute('stroke', val);
            self._drawStyle.stroke = val;
            $('#prop-stroke-hex').text(val);
        });

        // Stroke width
        live('#prop-stroke-width', function (el) {
            const val = $(this).val();
            el.setAttribute('stroke-width', val);
            self._drawStyle.strokeWidth = val;
        });

        // Stroke dash
        live('#prop-stroke-dash', function (el) {
            const val = $(this).val();
            if (val === 'none') el.removeAttribute('stroke-dasharray');
            else el.setAttribute('stroke-dasharray', val);
            self._drawStyle.strokeDasharray = val;
        });

        // Fill color
        live('#prop-fill-color', function (el) {
            const val   = $(this).val();
            const opStr = $('#prop-fill-opacity').val();
            const op    = parseFloat(opStr);
            el.setAttribute('fill', val);
            el.setAttribute('fill-opacity', String(isNaN(op) ? 1 : op));
            self._drawStyle.fill = val;
            $('#prop-fill-hex').text(val);
        });

        // Fill opacity
        live('#prop-fill-opacity', function (el) {
            const op = parseFloat($(this).val());
            el.setAttribute('fill-opacity', String(op));
        });

        // No fill
        $(document).on('click.prop', '#prop-no-fill', function () {
            if (!self._propPanelTarget) return;
            self._propPanelTarget.setAttribute('fill', 'none');
            self._propPanelTarget.removeAttribute('fill-opacity');
            self._drawStyle.fill = 'none';
            $('#prop-fill-opacity').val(0);
        });

        // Text content
        live('#prop-text-content', function (el) {
            el.textContent = $(this).val();
        });

        // Font size
        live('#prop-font-size', function (el) {
            el.setAttribute('font-size', $(this).val());
        });

        // Font family
        live('#prop-font-family', function (el) {
            el.setAttribute('font-family', $(this).val());
        });

        // Border radius (rect)
        live('#prop-border-radius', function (el) {
            const v = $(this).val();
            el.setAttribute('rx', v);
            el.setAttribute('ry', v);
            $('#prop-radius-val').text(`${v}px`);
        });

        // Align buttons
        $(document).on('click.prop', '.prop-align-btn', function () {
            const action = $(this).data('align');
            const map = {
                left:    () => self.alignLeft(),
                centerH: () => self.alignCenterH(),
                right:   () => self.alignRight(),
                top:     () => self.alignTop(),
                centerV: () => self.alignCenterV(),
                bottom:  () => self.alignBottom(),
                distH:   () => self.distributeH(),
                distV:   () => self.distributeV(),
            };
            if (map[action]) map[action]();
        });

        // Push to history on change-end (blur / pointerup)
        $(document).on('change.propcommit', '#prop-x, #prop-y, #prop-w, #prop-h, #prop-rotation', () => {
            if (!self._propPanelTarget) return;
            self.pushHistory('Property Edit', '', self._captureFullState());
        });
    },

    // ── Color utilities ───────────────────────────────────────
    _isValidColor(str) {
        if (!str || str === 'none' || str === 'transparent') return false;
        const s = new Option().style;
        s.color = str;
        return s.color !== '';
    },

    _toHex(color) {
        if (!color || color === 'none') return '#000000';
        if (/^#[0-9a-f]{3,6}$/i.test(color)) return color;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        return ctx.fillStyle; // browser normalises to #rrggbb
    },
});
