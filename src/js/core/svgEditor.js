/* ============================================================
   SVG Wiring Editor — Core Class
   Constructor, element init, gesture setup, event binding
   ============================================================ */

class MobileSVGEditor {
    constructor() {
        // View state
        this.currentZoom = 1;
        this.currentRotation = 0;
        this.currentTranslate = { x: 0, y: 0 };
        this.currentPitch = 0;
        this.currentYaw = 0;
        this.dragStart = { x: 0, y: 0 };

        // Interaction flags
        this.isDragging = false;
        this.isCtrlHeld = false;
        this.isShiftHeld = false;
        this.isWireTracing = false;
        this.isConnectionWire = false;
        this.isComponentBox = false;

        // SVG data
        this.wires = [];
        this.components = [];
        this.wireConnections = [];
        this.selectedElements = [];
        this.originalViewBox = null;

        // Misc
        this.miniMapVisible = false;
        this.clickTimeout = null;
        this.toastTimeout = null;

        // Measure state
        this._measuring = false;
        this._measurePoints = [];
        this._measureUnit = 'px';
        this._measureScaleFactor = null;
        this._measurePxVal = 1;
        this._measureUnitVal = 1;

        // History (populated by history.js)
        this._historyStack = [];
        this._historyIndex = -1;

        // Multi-display
        this.displays = [];
        this.activeDisplayIdx = -1;

        this.SVG_NS = 'http://www.w3.org/2000/svg';

        this.initializeElements();
        this.setupGestures();
        this.bindEvents();
        this.setupTouchFeedback();
    }

    initializeElements() {
        this.$svgViewer      = $('#svgViewer');
        this.$svgContainer   = $('#svgContainer');
        this.$svgWrapper     = $('#svgWrapper');
        this.$svgDisplay     = $('#svgDisplay');
        this.$sidePanel      = $('#sidePanel');
        this.$bottomControls = $('#bottomControls');
        this.$miniMap        = $('#miniMap');
        this.$miniMapSvg     = $('#miniMapSvg');
        this.$miniMapViewport = $('#miniMapViewport');
        this.$toast          = $('#toast');
        this.$zoomSlider     = $('#zoomSlider');
        this.$rotationSlider = $('#rotationSlider');
        this.$pitchSlider    = $('#pitchSlider');
        this.$rotateYSlider  = $('#rotateYSlider');
        this.$perspectiveSlider = $('#perspectiveSlider');
    }

    setupGestures() {
        const hammer = new Hammer(this.$svgContainer[0]);

        hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 6 });
        hammer.get('pinch').set({ enable: true });
        hammer.get('rotate').set({ enable: true });
        hammer.get('doubletap').set({ interval: 300, posThreshold: 50 });

        hammer.get('pinch').recognizeWith(hammer.get('rotate'));
        hammer.get('pan').recognizeWith([hammer.get('pinch'), hammer.get('rotate')]);

        let gesture = {
            baseZoom: this.currentZoom,
            baseRotation: this.currentRotation,
            baseTranslate: { ...this.currentTranslate },
            prevHammerRotation: 0,
            prevHammerScale: 1,
            prevDelta: { x: 0, y: 0 },
            active: false,
        };

        hammer.on('pinchstart rotatestart panstart', (ev) => {
            gesture.active = true;
            gesture.baseZoom = this.currentZoom;
            gesture.baseRotation = this.currentRotation;
            gesture.baseTranslate = { ...this.currentTranslate };
            gesture.prevHammerRotation = ev.rotation || 0;
            gesture.prevHammerScale = ev.scale || 1;
            gesture.prevDelta = { x: ev.deltaX || 0, y: ev.deltaY || 0 };
        });

        hammer.on('pinchmove rotatemove panmove', (ev) => {
            if (!gesture.active) return;

            if (typeof ev.scale === 'number') {
                const relativeScale = ev.scale / (gesture.prevHammerScale || 1);
                gesture.baseZoom = Math.max(0.1, Math.min(100, gesture.baseZoom * relativeScale));
                this.setZoom(gesture.baseZoom);
                gesture.prevHammerScale = ev.scale;
            }

            if (typeof ev.rotation === 'number') {
                const rotationDelta = ev.rotation - (gesture.prevHammerRotation || 0);
                this.setRotation(this.currentRotation + rotationDelta);
                gesture.prevHammerRotation = ev.rotation;
            }

            if (typeof ev.deltaX === 'number' && typeof ev.deltaY === 'number') {
                const dx = ev.deltaX - (gesture.prevDelta.x || 0);
                const dy = ev.deltaY - (gesture.prevDelta.y || 0);
                this.currentTranslate = {
                    x: this.currentTranslate.x + dx,
                    y: this.currentTranslate.y + dy,
                };
                this.updateTransform();
                gesture.prevDelta.x = ev.deltaX;
                gesture.prevDelta.y = ev.deltaY;
            }

            this.updateSliders();
        });

        hammer.on('pinchend rotateend panend', () => {
            gesture.active = false;
            gesture.prevHammerRotation = 0;
            gesture.prevHammerScale = 1;
            gesture.prevDelta = { x: 0, y: 0 };
            gesture.baseZoom = this.currentZoom;
            gesture.baseRotation = this.currentRotation;
            gesture.baseTranslate = { ...this.currentTranslate };
        });
    }

    setupTouchFeedback() {
        this.touchFeedbackTimeout = null;
    }

    showTouchFeedback(x, y) {
        const $feedback = $('<div class="touch-feedback"></div>');
        $feedback.css({ left: x + 'px', top: y + 'px' });
        this.$svgContainer.append($feedback);
        setTimeout(() => $feedback.remove(), 500);
    }

    bindEvents() {
        // Load file (multi-select)
        $('#loadFileBtn').on('click', () => $('#hiddenFileInput').click());
        $('#svgFileInput, #hiddenFileInput').on('change', (e) => this.loadSVGFiles(e));

        // Timeline filmstrip
        $('#timelineBtn').on('click', () => this.showTimeline());

        // Trace wire switch — fixed: no broken $(this) in arrow fn
        $('#traceWireBtn').on('click', () => this.toggleWireTracing());

        // Toolbar
        $('#toggleControlsBtn').on('click', () => this.toggleBottomControls());
        $('#resetViewBtn').on('click', () => this.resetView());

        // Bottom controls
        $('#zoomInBtn').on('click',    () => this.zoomIn());
        $('#zoomOutBtn').on('click',   () => this.zoomOut());
        $('#fitViewBtn').on('click',   () => this.fitToView());
        $('#rotateBtn').on('click',    () => this.rotateView());
        $('#rotateLeftBtn').on('click',() => this.rotateViewLeft());
        $('#layersBtn').on('click',    () => this.toggleSidePanel());
        $('#measureBtn').on('click',   () => this.toggleMeasureTool());
        $('#transformBtn').on('click', () => this.toggleSidePanel());

        // Wiring toolbar
        $('#highlightComponentsBtn').on('click', () => {
            if (this.isComponentBox) {
                this.hideComponentBox();
            } else {
                this.highlightComponents();
            }
            this.isComponentBox = !this.isComponentBox;
        });

        $('#showConnectionsBtn').on('click', () => {
            if (this.isConnectionWire) {
                this.hideConnections();
            } else {
                this.showConnections();
            }
            this.isConnectionWire = !this.isConnectionWire;
        });

        $('#clearHighlightsBtn').on('click', () => this.clearAllHighlights());

        // Export / display
        $('#exportViewBtn').on('click',    () => this.exportCurrentView());
        $('#exportHtmlBtn').on('click',    () => this.exportAsHtml());
        $('#exportJsonBtn').on('click',    () => this.exportAsJson());
        $('#batchExportBtn').on('click',   () => this.batchExport());
        $('#toggleMiniMapBtn').on('click', () => this.toggleMiniMap());
        $('#darkModeBtn').on('click',      () => this.toggleDarkMode());

        // Side panel
        $('#closePanelBtn').on('click', () => this.closeSidePanel());

        // Undo / redo
        $('#undoBtn').on('click', () => this.undo());
        $('#redoBtn').on('click', () => this.redo());

        // Sliders
        $('#zoomSlider').on('input',       (e) => this.setZoom(parseFloat(e.target.value)));
        $('#rotationSlider').on('input',   (e) => this.setRotation(parseFloat(e.target.value)));
        $('#pitchSlider').on('input',      (e) => this.setPitch(parseFloat(e.target.value)));
        $('#rotateYSlider').on('input',    (e) => this.setYRotation(parseFloat(e.target.value)));
        $('#perspectiveSlider').on('input', (e) => {
            const val = parseFloat(e.target.value);
            $('#perspectiveValue').text(val);
            this.$svgWrapper.css('perspective', val + 'px');
        });

        // Mouse drag
        this.$svgContainer.on('mousedown', (e) => this.startDrag(e));
        $(document).on('mousemove', (e) => this.drag(e));
        $(document).on('mouseup',  () => this.endDrag());

        // Wheel zoom
        this.$svgContainer.on('wheel', (e) => this.handleWheel(e));

        // Keyboard modifiers + undo/redo shortcuts
        $(document).on('keydown', (e) => {
            if (e.key === 'Shift') this.isShiftHeld = true;
            if (e.key === 'Control' || e.key === 'Meta') this.isCtrlHeld = true;

            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); this.redo(); }
        });

        $(document).on('keyup', (e) => {
            if (e.key === 'Shift') this.isShiftHeld = false;
            if (e.key === 'Control' || e.key === 'Meta') this.isCtrlHeld = false;
        });

        // Accordion toggle
        $(document).on('click', '.accordion.slide-bar', function () {
            $(this).toggleClass('active');
        });

        // Click outside side panel closes it
        $(document).on('click', (e) => {
            const $t = $(e.target);
            if (!$t.closest('#sidePanel').length &&
                !$t.closest('#transformBtn, #closePanelBtn, #layersBtn').length &&
                this.$sidePanel.hasClass('open')) {
                this.closeSidePanel();
            }
        });

        // Prevent context menu on long press
        this.$svgContainer.on('contextmenu', (e) => e.preventDefault());

        // Measure modal — tab switching
        $(document).on('click', '.measure-tab', (e) => {
            const system = $(e.currentTarget).data('system');
            $('.measure-tab').removeClass('active');
            $(e.currentTarget).addClass('active');
            $('.measure-unit-group').hide();
            $(`.measure-unit-group[data-system="${system}"]`).show();
            // Select first unit in group
            const $first = $(`.measure-unit-group[data-system="${system}"] .measure-unit-btn`).first();
            $('.measure-unit-btn').removeClass('active');
            $first.addClass('active');
            // Show/hide scale row
            const showScale = system !== 'px';
            $('#measureScaleRow').toggle(showScale);
            if (showScale) $('#measureScaleUnitLabel').text($first.data('unit'));
        });

        // Measure modal — unit button selection
        $(document).on('click', '.measure-unit-btn', (e) => {
            $('.measure-unit-btn').removeClass('active');
            $(e.currentTarget).addClass('active');
            const unit = $(e.currentTarget).data('unit');
            if (unit !== 'px') $('#measureScaleUnitLabel').text(unit);
        });

        // Measure modal — OK
        $('#measureModalOk').on('click', () => {
            const unit = $('.measure-unit-btn.active').data('unit') || 'px';
            const pxVal   = parseFloat($('#measurePxVal').val())   || 1;
            const unitVal = parseFloat($('#measureUnitVal').val())  || 1;

            this._measureUnit        = unit;
            this._measurePxVal       = pxVal;
            this._measureUnitVal     = unitVal;
            this._measureScaleFactor = unit === 'px' ? null : (unitVal / pxVal);

            $('#measureModal').removeClass('open');
            this._startMeasuring();
        });

        // Measure modal — Cancel
        $('#measureModalCancel').on('click', () => {
            $('#measureModal').removeClass('open');
        });

        // Measure modal — backdrop click closes
        $('#measureModal').on('click', (e) => {
            if ($(e.target).is('#measureModal')) $('#measureModal').removeClass('open');
        });

        // Orientation / resize
        $(window).on('orientationchange resize', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
    }

    // Utility: scale a value from one range to another
    scaleValue(value, fromMin, fromMax, toMin, toMax) {
        return ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
    }
}
