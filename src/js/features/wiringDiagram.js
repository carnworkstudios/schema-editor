/* ============================================================
   SVG Wiring Editor — Wiring Diagram Feature
   SVG file loading, element analysis, interaction setup
   ============================================================ */

Object.assign(MobileSVGEditor.prototype, {

    loadSVGFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        this.showLoading(true);

        if (ext === 'svg' || ext === 'svgz' || file.type === 'image/svg+xml') {
            this._loadSVG(file);
        } else if (ext === 'pdf' || file.type === 'application/pdf') {
            this._loadPDF(file);
        } else if (ext === 'plt' || ext === 'hpgl') {
            this._loadPLT(file);
        } else if (ext === 'dwf' || ext === 'dwfx') {
            this._loadDWF(file);
        } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'bmp' ||
                   ext === 'tif' || ext === 'tiff' || file.type.startsWith('image/')) {
            this._loadRasterImage(file);
        } else {
            this.showToast('Unsupported format: .' + ext, 'error');
            this.showLoading(false);
        }
    },

    // ── Shared: mount a parsed SVG string into the display and activate all features ──
    _mountParsedSvg(svgContent, toastMsg) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        if (!svgElement) throw new Error('Invalid SVG content');

        this.$svgDisplay.empty();
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) { this.$svgDisplay.attr('viewBox', viewBox); this.originalViewBox = viewBox; }
        $(svgElement).children().each((_, child) => { this.$svgDisplay.append($(child).clone()); });

        this.setupSVGInteractions();
        this.resetView();
        this.updateMiniMap();
        this.showToast(toastMsg, 'success');
        this.closeSidePanel();
    },

    // ── Shared: embed a raster data URL as an SVG <image> (trace/highlight unavailable) ──
    _embedAsImage(src, width, height, filename) {
        this.$svgDisplay.empty();
        this.$svgDisplay.attr('viewBox', `0 0 ${width} ${height}`);
        this.originalViewBox = `0 0 ${width} ${height}`;

        const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageEl.setAttribute('href', src);
        imageEl.setAttribute('x', '0');
        imageEl.setAttribute('y', '0');
        imageEl.setAttribute('width', String(width));
        imageEl.setAttribute('height', String(height));
        imageEl.setAttribute('data-filename', filename);
        this.$svgDisplay[0].appendChild(imageEl);

        this.resetView();
        this.updateMiniMap();
        this.showToast(`${filename} loaded as image — wire trace & highlight unavailable for raster files`, 'success');
        this.closeSidePanel();
        this.showLoading(false);
    },

    // ── Canvas mode: embed raster visual + build invisible SVG overlay for interaction ──
    _mountCanvasAsSvg(canvas, filename) {
        const W = canvas.width, H = canvas.height;
        const NS = 'http://www.w3.org/2000/svg';

        this.$svgDisplay.empty();
        this.$svgDisplay.attr('viewBox', `0 0 ${W} ${H}`);
        this.originalViewBox = `0 0 ${W} ${H}`;

        // Visual layer — the rasterized image
        const imgEl = document.createElementNS(NS, 'image');
        imgEl.setAttribute('href', canvas.toDataURL('image/png'));
        imgEl.setAttribute('x', '0'); imgEl.setAttribute('y', '0');
        imgEl.setAttribute('width', String(W)); imgEl.setAttribute('height', String(H));
        this.$svgDisplay[0].appendChild(imgEl);

        // Interaction layer — pixel-detected wires and components as invisible SVG overlays
        this.wires = [];
        this.components = [];
        this.analyzeCanvasDiagram(canvas);

        // Bind hover on canvas overlay hitboxes
        if (!('ontouchstart' in window)) {
            this.wires.forEach(w => {
                w.$hitbox
                    .on('mouseenter', () => this.highlightElement(w.$element, true))
                    .on('mouseleave', () => this.highlightElement(w.$element, false));
            });
            this.components.forEach(c => {
                c.$element
                    .on('mouseenter', () => this.highlightElement(c.$element, true))
                    .on('mouseleave', () => this.highlightElement(c.$element, false));
            });
        }

        this.resetView();
        this.updateMiniMap();
        this.showToast(
            `${filename} loaded — ${this.wires.length} wires, ${this.components.length} components detected`,
            'success'
        );
        this.closeSidePanel();
        this.showLoading(false);
    },

    // ── SVG ──────────────────────────────────────────────────
    _loadSVG(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this._mountParsedSvg(e.target.result, 'SVG loaded — all features active');
            } catch (err) {
                this.showToast('Error loading SVG: ' + err.message, 'error');
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    },

    // ── PDF: direct operator-list extraction → native SVG paths ──────────────
    _loadPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            this.showToast('PDF renderer not available.', 'error');
            this.showLoading(false);
            return;
        }
        const url = URL.createObjectURL(file);
        pdfjsLib.getDocument(url).promise
            .then(pdf => pdf.getPage(1))
            .then(page => this._pdfOpsToSvg(page))
            .then(svgContent => {
                URL.revokeObjectURL(url);
                this._mountParsedSvg(svgContent, `${file.name} — vector paths extracted`);
            })
            .catch(err => {
                URL.revokeObjectURL(url);
                this.showToast('PDF load error: ' + err.message, 'error');
            })
            .finally(() => this.showLoading(false));
    },

    // ── Extract PDF drawing operators → SVG path elements ────────────────────
    _pdfOpsToSvg(page) {
        const OPS = pdfjsLib.OPS;
        const [, , W, H] = page.view; // page dimensions in PDF user units

        return page.getOperatorList().then(({ fnArray, argsArray }) => {
            const elements = [];
            let d = '';
            let cx = 0, cy = 0;
            const stateStack = [];
            let state = { stroke: '#000000', fill: 'none', lineWidth: 1 };

            const flipY = y => H - y;

            const toHex = (r, g, b) => {
                const h = v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
                return `#${h(r)}${h(g)}${h(b)}`;
            };

            const flushPath = (mode) => {
                if (!d.trim()) return;
                elements.push({
                    d: d.trim(),
                    stroke: (mode === 'stroke' || mode === 'fillStroke') ? state.stroke : 'none',
                    fill:   (mode === 'fill'   || mode === 'fillStroke') ? state.fill   : 'none',
                    lw: state.lineWidth,
                });
                d = '';
            };

            for (let i = 0; i < fnArray.length; i++) {
                const fn = fnArray[i];
                const a  = argsArray[i];
                switch (fn) {
                    case OPS.save:    stateStack.push({ ...state }); break;
                    case OPS.restore: if (stateStack.length) state = stateStack.pop(); break;

                    case OPS.moveTo:
                        cx = a[0]; cy = flipY(a[1]);
                        d += `M ${cx.toFixed(2)} ${cy.toFixed(2)} `; break;
                    case OPS.lineTo:
                        cx = a[0]; cy = flipY(a[1]);
                        d += `L ${cx.toFixed(2)} ${cy.toFixed(2)} `; break;
                    case OPS.curveTo:   // c: x1 y1 x2 y2 x3 y3
                        d += `C ${a[0].toFixed(2)} ${flipY(a[1]).toFixed(2)} ${a[2].toFixed(2)} ${flipY(a[3]).toFixed(2)} ${a[4].toFixed(2)} ${flipY(a[5]).toFixed(2)} `;
                        cx = a[4]; cy = flipY(a[5]); break;
                    case OPS.curveTo2:  // v: x2 y2 x3 y3 — first CP = current point
                        d += `C ${cx.toFixed(2)} ${cy.toFixed(2)} ${a[0].toFixed(2)} ${flipY(a[1]).toFixed(2)} ${a[2].toFixed(2)} ${flipY(a[3]).toFixed(2)} `;
                        cx = a[2]; cy = flipY(a[3]); break;
                    case OPS.curveTo3:  // y: x1 y1 x3 y3 — last CP = end point
                        d += `C ${a[0].toFixed(2)} ${flipY(a[1]).toFixed(2)} ${a[2].toFixed(2)} ${flipY(a[3]).toFixed(2)} ${a[2].toFixed(2)} ${flipY(a[3]).toFixed(2)} `;
                        cx = a[2]; cy = flipY(a[3]); break;
                    case OPS.closePath: d += 'Z '; break;
                    case OPS.rectangle: {
                        const rx = a[0].toFixed(2), ry = flipY(a[1]).toFixed(2);
                        const rw = a[2].toFixed(2), rh = (a[3]).toFixed(2);
                        d += `M ${rx} ${ry} h ${rw} v ${-rh} h ${-rw} Z `;
                        break;
                    }
                    case OPS.stroke:            flushPath('stroke'); break;
                    case OPS.closeStroke:       d += 'Z '; flushPath('stroke'); break;
                    case OPS.fill:
                    case OPS.eoFill:            flushPath('fill'); break;
                    case OPS.fillStroke:
                    case OPS.eoFillStroke:      flushPath('fillStroke'); break;
                    case OPS.closeFillStroke:
                    case OPS.closeEOFillStroke: d += 'Z '; flushPath('fillStroke'); break;
                    case OPS.endPath:           d = ''; break;

                    case OPS.setLineWidth:      state.lineWidth = a[0]; break;
                    case OPS.setStrokeRGBColor: state.stroke = toHex(a[0], a[1], a[2]); break;
                    case OPS.setFillRGBColor:   state.fill   = toHex(a[0], a[1], a[2]); break;
                    case OPS.setStrokeGray:     state.stroke = toHex(a[0], a[0], a[0]); break;
                    case OPS.setFillGray:       state.fill   = toHex(a[0], a[0], a[0]); break;
                    case OPS.setStrokeColor:
                    case OPS.setStrokeColorN:
                        if (a && a.length >= 3) state.stroke = toHex(a[0], a[1], a[2]);
                        else if (a && a.length === 1) state.stroke = toHex(a[0], a[0], a[0]);
                        break;
                    case OPS.setFillColor:
                    case OPS.setFillColorN:
                        if (a && a.length >= 3) state.fill = toHex(a[0], a[1], a[2]);
                        else if (a && a.length === 1) state.fill = toHex(a[0], a[0], a[0]);
                        break;
                    case OPS.setStrokeCMYKColor: state.stroke = this._cmykToHex(...a); break;
                    case OPS.setFillCMYKColor:   state.fill   = this._cmykToHex(...a); break;
                }
            }

            if (!elements.length) {
                throw new Error('No vector paths in PDF — export as SVG from your CAD tool for best results');
            }

            const svgPaths = elements.map(el =>
                `<path d="${el.d}" stroke="${el.stroke}" fill="${el.fill}" stroke-width="${el.lw.toFixed(2)}"/>`
            ).join('\n');

            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">\n${svgPaths}\n</svg>`;
        });
    },

    _cmykToHex(c, m, y, k) {
        const h = v => Math.round(Math.min(255, Math.max(0, v * 255))).toString(16).padStart(2, '0');
        const r = 1 - Math.min(1, c * (1 - k) + k);
        const g = 1 - Math.min(1, m * (1 - k) + k);
        const b = 1 - Math.min(1, y * (1 - k) + k);
        return `#${h(r)}${h(g)}${h(b)}`;
    },

    // ── Raster images: bitmap trace → SVG paths via ImageTracer.js ───────────
    _loadRasterImage(file) {
        if (typeof ImageTracer === 'undefined') {
            this.showToast('ImageTracer not loaded — cannot trace raster image', 'error');
            this.showLoading(false);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            ImageTracer.imageToSVG(
                e.target.result,
                (svgStr) => {
                    try {
                        this._mountParsedSvg(svgStr, `${file.name} — bitmap traced to SVG`);
                    } catch (err) {
                        this.showToast('Trace error: ' + err.message, 'error');
                    } finally {
                        this.showLoading(false);
                    }
                },
                {
                    // Optimised for technical line drawings
                    ltres: 1, qtres: 1, pathomit: 8,
                    rightangleenhance: true,
                    colorsampling: 2, numberofcolors: 16,
                    mincolorratio: 0, colorquantcycles: 3,
                    scale: 1, strokewidth: 1,
                    linefilter: false, viewbox: true, desc: false,
                    blurradius: 0, blurdelta: 20,
                }
            );
        };
        reader.readAsDataURL(file);
    },

    // ── PLT / HPGL: converts to SVG paths — all features active ──
    _loadPLT(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this._mountParsedSvg(this._hpglToSvg(e.target.result), 'PLT loaded — wire trace & highlight active');
            } catch (err) {
                this.showToast('Error loading PLT: ' + err.message, 'error');
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    },

    // ── DWF: extract embedded SVG if present ──────────────────
    _loadDWF(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const svgMatch = e.target.result.match(/<svg[\s\S]*?<\/svg>/i);
                if (!svgMatch) throw new Error('DWF format is not renderable in-browser. Export as SVG or PDF from your CAD tool first.');
                this._mountParsedSvg(svgMatch[0], 'DWF loaded — wire trace & highlight active');
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    },

    _hpglToSvg(hpgl) {
        const penColors = ['#000000', '#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41'];
        const paths = [];
        let currentPath = '';
        let penDown = false;
        let currentX = 0, currentY = 0;
        let currentPen = 0;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const updateBounds = (x, y) => {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        };
        const flushPath = () => {
            if (currentPath) { paths.push({ d: currentPath, pen: currentPen }); currentPath = ''; }
        };

        const tokens = hpgl.replace(/\r/g, '').split(/[;\n]+/).map(t => t.trim()).filter(Boolean);

        for (const token of tokens) {
            const cmd = token.slice(0, 2).toUpperCase();
            const args = token.slice(2).trim().split(/[\s,]+/).filter(Boolean).map(Number);

            switch (cmd) {
                case 'IN':
                    flushPath(); currentX = 0; currentY = 0; penDown = false; break;
                case 'SP':
                    flushPath(); currentPen = Math.max(0, (args[0] || 1) - 1); break;
                case 'PU':
                    flushPath(); penDown = false;
                    if (args.length >= 2) {
                        for (let i = 0; i + 1 < args.length; i += 2) {
                            currentX = args[i]; currentY = args[i + 1]; updateBounds(currentX, currentY);
                        }
                    }
                    break;
                case 'PD':
                    penDown = true;
                    if (!currentPath) currentPath = `M ${currentX} ${currentY}`;
                    if (args.length >= 2) {
                        for (let i = 0; i + 1 < args.length; i += 2) {
                            currentX = args[i]; currentY = args[i + 1]; updateBounds(currentX, currentY);
                            currentPath += ` L ${currentX} ${currentY}`;
                        }
                    }
                    break;
                case 'PA':
                    if (args.length >= 2) {
                        for (let i = 0; i + 1 < args.length; i += 2) {
                            currentX = args[i]; currentY = args[i + 1]; updateBounds(currentX, currentY);
                            if (penDown) {
                                if (!currentPath) currentPath = `M ${currentX} ${currentY}`;
                                else currentPath += ` L ${currentX} ${currentY}`;
                            } else {
                                flushPath(); currentPath = `M ${currentX} ${currentY}`;
                            }
                        }
                    }
                    break;
                case 'PR':
                    if (args.length >= 2) {
                        for (let i = 0; i + 1 < args.length; i += 2) {
                            currentX += args[i]; currentY += args[i + 1]; updateBounds(currentX, currentY);
                            if (penDown) {
                                if (!currentPath) currentPath = `M ${currentX} ${currentY}`;
                                else currentPath += ` L ${currentX} ${currentY}`;
                            } else {
                                flushPath(); currentPath = `M ${currentX} ${currentY}`;
                            }
                        }
                    }
                    break;
                case 'CI': {
                    const r = args[0] || 1;
                    updateBounds(currentX - r, currentY - r); updateBounds(currentX + r, currentY + r);
                    paths.push({ d: `M ${currentX - r} ${currentY} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`, pen: currentPen });
                    break;
                }
            }
        }
        flushPath();

        if (!paths.length) throw new Error('No drawable content found in PLT file');

        const pad = 20;
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
        const w = maxX - minX + pad * 2;
        const h = maxY - minY + pad * 2;
        const ox = -minX + pad, oy = -minY + pad;

        const pathEls = paths.map(p => {
            const color = penColors[p.pen % penColors.length];
            return `<path d="${p.d}" stroke="${color}" stroke-width="1" fill="none" transform="translate(${ox} ${oy})"/>`;
        }).join('\n');

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">\n${pathEls}\n</svg>`;
    },

    setupSVGInteractions() {
        this.analyzeWiringDiagram();

        if ('ontouchstart' in window) return;

        this.$svgDisplay.find('path, line, polyline, polygon, circle, ellipse, rect, g').each((_, el) => {
            const $el = $(el);
            $el.on('mouseenter', () => {
                if (!this.selectedElements.includes(el)) this.highlightElement($el, true);
            });
            $el.on('mouseleave', () => {
                if (!this.selectedElements.includes(el)) this.highlightElement($el, false);
            });
        });
    },

    analyzeWiringDiagram() {
        this.wires = [];
        this.components = [];
        this.connections = [];

        const SVG_NS = this.SVG_NS;

        // ── Wire detection ──────────────────────────────────
        this.$svgDisplay.find(
            'line, path[d*="L"], path[d*="l"], path[d*="v"], path[d*="V"], path[d*="h"], path[d*="H"], polyline'
        ).each((index, origEl) => {
            const $orig = $(origEl);
            const originalStroke = $orig.attr('stroke') || 'black';
            const originalStrokeWidth = parseFloat($orig.attr('stroke-width') || '1');

            // Wrap in a group with a hitbox overlay
            const group = document.createElementNS(SVG_NS, 'g');
            group.setAttribute('class', 'wire-group');
            group.setAttribute('data-wire-id', `wire_${index}`);

            const cloneVisual = origEl.cloneNode(true);

            const cloneHitbox = origEl.cloneNode(true);
            cloneHitbox.setAttribute('stroke', originalStroke);
            cloneHitbox.setAttribute('stroke-opacity', '0');
            cloneHitbox.setAttribute('fill', 'none');
            cloneHitbox.setAttribute('class', 'wire-hitbox');
            cloneHitbox.setAttribute('data-wire-id', `wire_${index}`);

            group.appendChild(cloneVisual);
            group.appendChild(cloneHitbox);
            origEl.parentNode.replaceChild(group, origEl);

            this.wires.push({
                element: cloneVisual,
                $element: $(cloneVisual),
                $hitbox: $(cloneHitbox),
                $group: $(group),
                id: `wire_${index}`,
                color: originalStroke,
                width: originalStrokeWidth,
            });
        });

        // ── Component detection ─────────────────────────────
        this.$svgDisplay.find(
            'circle, rect, polygon, ellipse, path[d*="c"], path[d*="C"], path[d*="s"], path[d*="S"], g'
        ).not('.wire-group, .wire-group *, .component-group, .component-group *').each((index, origEl) => {
            const $orig = $(origEl);
            const bbox = origEl.getBBox ? origEl.getBBox() : { x: 0, y: 0, width: 0, height: 0 };
            if (bbox.width <= 10 && bbox.height <= 10) return;

            const tag = origEl.tagName.toLowerCase();
            const compId = `component_${index}`;

            const group = document.createElementNS(SVG_NS, 'g');
            group.setAttribute('class', 'component-group');
            group.setAttribute('data-component-id', compId);

            const cloneVisual = origEl.cloneNode(true);

            // Hitbox: groups get a bbox rect; shapes get a transparent clone
            let cloneHitbox;
            if (tag === 'g') {
                cloneHitbox = document.createElementNS(SVG_NS, 'rect');
                cloneHitbox.setAttribute('x', String(bbox.x));
                cloneHitbox.setAttribute('y', String(bbox.y));
                cloneHitbox.setAttribute('width', String(bbox.width));
                cloneHitbox.setAttribute('height', String(bbox.height));
            } else {
                cloneHitbox = origEl.cloneNode(true);
            }
            cloneHitbox.setAttribute('fill-opacity', '0');
            cloneHitbox.setAttribute('stroke-opacity', '0');
            cloneHitbox.setAttribute('pointer-events', 'all');
            cloneHitbox.setAttribute('class', 'component-hitbox');
            cloneHitbox.setAttribute('data-component-id', compId);

            group.appendChild(cloneVisual);
            group.appendChild(cloneHitbox);
            origEl.parentNode.replaceChild(group, origEl);

            this.components.push({
                element: cloneVisual,
                $element: $(cloneVisual),
                $hitbox: $(cloneHitbox),
                $group: $(group),
                id: compId,
                bbox,
                type: this.identifyComponentType($orig),
            });
        });

        console.log(`SVG analyzed: ${this.wires.length} wires, ${this.components.length} components`);
    },

    identifyComponentType($element) {
        const tag = $element[0].tagName.toLowerCase();
        const cls = $element.attr('class') || '';
        const id  = $element.attr('id') || '';

        if (tag === 'circle') return 'connector';
        if (tag === 'rect') return 'module';
        if (cls.includes('resistor')) return 'resistor';
        if (cls.includes('capacitor')) return 'capacitor';
        if (cls.includes('switch')) return 'switch';
        if (id.includes('relay')) return 'relay';
        return 'component';
    },

    // ── Selection helpers ────────────────────────────────────

    handleTap(event) {
        const target = event.target;
        if (target && target !== this.$svgContainer[0] && target !== this.$svgWrapper[0]) {
            this.selectElement($(target));
        }
    },

    selectElement($element) {
        this.selectedElements = [$element[0]];
        $element.addClass('selected-element');
        this.showElementInfo($element);
        if (this.isWire($element)) {
            this.highlightConnectedComponents($element);
        }
    },

    isWire($element) {
        return this.wires.some(w => w.element === $element[0]);
    },

    showElementInfo($element) {
        const tag = $element[0].tagName;
        const cls = $element.attr('class') || 'None';
        const id  = $element.attr('id') || 'None';
        this.showToast(`${tag}  cls:${cls}  id:${id}`, 'success');
    },

    clearSelection() {
        this.selectedElements.forEach(el => $(el).removeClass('selected-element'));
        this.selectedElements = [];
        this.clearAllHighlights();
    },

    highlightConnectedComponents($wireElement) {
        const wireEndPoints = this.getWireEndPoints($wireElement);
        this.components.forEach(comp => {
            const b = comp.bbox;
            wireEndPoints.forEach(pt => {
                const dist = Math.hypot(pt.x - (b.x + b.width / 2), pt.y - (b.y + b.height / 2));
                if (dist < 20) comp.$element.addClass('component-highlight');
            });
        });
    },

    getWireEndPoints($wire) {
        const el = $wire[0];
        const pts = [];
        if (el.tagName === 'line') {
            pts.push(
                { x: parseFloat($wire.attr('x1')), y: parseFloat($wire.attr('y1')) },
                { x: parseFloat($wire.attr('x2')), y: parseFloat($wire.attr('y2')) }
            );
        } else if (el.tagName === 'path') {
            const m = ($wire.attr('d') || '').match(/[\d.]+/g);
            if (m && m.length >= 4) {
                pts.push(
                    { x: parseFloat(m[0]), y: parseFloat(m[1]) },
                    { x: parseFloat(m[m.length - 2]), y: parseFloat(m[m.length - 1]) }
                );
            }
        }
        return pts;
    },

    highlightElement($element, on) {
        if (on) {
            // Canvas-mode overlay wires are invisible by default — reveal on hover
            const isCanvasOverlay = $element.hasClass('canvas-wire-overlay') ||
                                    $element.hasClass('canvas-component-overlay');
            $element.css(isCanvasOverlay
                ? { stroke: '#4facfe', 'stroke-opacity': '0.75' }
                : { stroke: '#4facfe' });
        } else {
            $element.css({ stroke: '', 'stroke-width': '', filter: '', 'stroke-opacity': '' });
        }
    },

    // ── Canvas-mode wire and component detection ──────────────
    analyzeCanvasDiagram(canvas) {
        const W = canvas.width, H = canvas.height;
        const NS = 'http://www.w3.org/2000/svg';
        const { data } = canvas.getContext('2d').getImageData(0, 0, W, H);

        // 1. Binary image — 1 = dark pixel
        const bin = new Uint8Array(W * H);
        const DARK = 200; // luminance threshold
        for (let i = 0; i < W * H; i++) {
            if (data[i * 4 + 3] < 128) continue; // transparent = light
            bin[i] = (data[i*4] * 0.299 + data[i*4+1] * 0.587 + data[i*4+2] * 0.114) < DARK ? 1 : 0;
        }

        // 2. Scan rows/columns for continuous dark pixel runs ≥ MIN_LEN
        const MIN_LEN = Math.max(20, Math.round(W * 0.015));
        const hRuns = [], vRuns = [];

        for (let y = 0; y < H; y++) {
            let s = -1;
            for (let x = 0; x <= W; x++) {
                const dark = x < W && bin[y * W + x];
                if (dark && s < 0) { s = x; }
                else if (!dark && s >= 0) { if (x - s >= MIN_LEN) hRuns.push({ pos: y, a: s, b: x - 1 }); s = -1; }
            }
        }
        for (let x = 0; x < W; x++) {
            let s = -1;
            for (let y = 0; y <= H; y++) {
                const dark = y < H && bin[y * W + x];
                if (dark && s < 0) { s = y; }
                else if (!dark && s >= 0) { if (y - s >= MIN_LEN) vRuns.push({ pos: x, a: s, b: y - 1 }); s = -1; }
            }
        }

        // 3. Cluster nearby parallel runs → one representative line per wire stroke
        const MAX_W = 5; // max stroke width in pixels
        const cluster = (runs) => {
            if (!runs.length) return [];
            runs.sort((a, b) => a.pos - b.pos || a.a - b.a);
            const groups = [];
            for (const r of runs) {
                let placed = false;
                for (const g of groups) {
                    if (Math.abs(g.pos - r.pos) <= MAX_W && r.a <= g.b + MAX_W && r.b >= g.a - MAX_W) {
                        g.posSum += r.pos; g.n++;
                        g.pos = g.posSum / g.n;
                        g.a = Math.min(g.a, r.a); g.b = Math.max(g.b, r.b);
                        placed = true; break;
                    }
                }
                if (!placed) groups.push({ pos: r.pos, posSum: r.pos, n: 1, a: r.a, b: r.b });
            }
            return groups.map(g => ({ pos: Math.round(g.pos), a: g.a, b: g.b }));
        };

        const hLines = cluster(hRuns);
        const vLines = cluster(vRuns);

        // 4. Sample actual stroke colour from the canvas pixels at wire midpoint
        const sampleColor = (x, y) => {
            const i = (Math.clamp ? Math.clamp(Math.round(y), 0, H-1) : Math.min(Math.max(Math.round(y), 0), H-1)) * W
                    + Math.min(Math.max(Math.round(x), 0), W-1);
            return `rgb(${data[i*4]},${data[i*4+1]},${data[i*4+2]})`;
        };

        // 5. Build invisible SVG <line> overlays for each detected wire
        const allSegs = [
            ...hLines.map(l => ({ x1: l.a, y1: l.pos, x2: l.b, y2: l.pos, color: sampleColor((l.a+l.b)/2, l.pos) })),
            ...vLines.map(l => ({ x1: l.pos, y1: l.a, x2: l.pos, y2: l.b, color: sampleColor(l.pos, (l.a+l.b)/2) })),
        ];

        allSegs.forEach((seg, idx) => {
            const id = `wire_${this.wires.length + idx}`;
            const group = document.createElementNS(NS, 'g');
            group.setAttribute('class', 'wire-group');
            group.setAttribute('data-wire-id', id);

            const visual = document.createElementNS(NS, 'line');
            visual.setAttribute('x1', String(seg.x1)); visual.setAttribute('y1', String(seg.y1));
            visual.setAttribute('x2', String(seg.x2)); visual.setAttribute('y2', String(seg.y2));
            visual.setAttribute('stroke', seg.color);
            visual.setAttribute('stroke-width', '3');
            visual.setAttribute('class', 'canvas-wire-overlay');

            const hitbox = document.createElementNS(NS, 'line');
            hitbox.setAttribute('x1', String(seg.x1)); hitbox.setAttribute('y1', String(seg.y1));
            hitbox.setAttribute('x2', String(seg.x2)); hitbox.setAttribute('y2', String(seg.y2));
            hitbox.setAttribute('stroke', '#000');
            hitbox.setAttribute('stroke-width', '12');
            hitbox.setAttribute('fill', 'none');
            hitbox.setAttribute('class', 'wire-hitbox canvas-wire-hitbox');
            hitbox.setAttribute('data-wire-id', id);

            group.appendChild(visual);
            group.appendChild(hitbox);
            this.$svgDisplay[0].appendChild(group);

            this.wires.push({
                element: visual, $element: $(visual),
                $hitbox: $(hitbox), $group: $(group),
                id, color: seg.color, width: 3,
            });
        });

        // 6. BFS flood-fill: find connected dark regions not covered by wires → components
        const wireMask = new Uint8Array(W * H);
        for (const l of hLines) for (let x = l.a; x <= l.b; x++) wireMask[l.pos * W + x] = 1;
        for (const l of vLines) for (let y = l.a; y <= l.b; y++) wireMask[y * W + l.pos] = 1;

        const visited = new Uint8Array(W * H);
        const MIN_DIM = 12, MAX_PIXELS = 40000;

        for (let sy = 0; sy < H; sy++) {
            for (let sx = 0; sx < W; sx++) {
                const si = sy * W + sx;
                if (!bin[si] || wireMask[si] || visited[si]) continue;

                const stack = [si];
                visited[si] = 1;
                let minX = sx, maxX = sx, minY = sy, maxY = sy, count = 0;

                while (stack.length && count < MAX_PIXELS) {
                    const ci = stack.pop();
                    const cx = ci % W, cy = (ci / W) | 0;
                    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                    count++;
                    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                        const nx = cx + dx, ny = cy + dy;
                        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                        const ni = ny * W + nx;
                        if (!bin[ni] || visited[ni]) continue;
                        visited[ni] = 1;
                        stack.push(ni);
                    }
                }

                const bw = maxX - minX, bh = maxY - minY;
                if (bw < MIN_DIM && bh < MIN_DIM) continue;

                const ar = bw > 0 ? bh / bw : 1;
                const fillRatio = count / ((bw + 1) * (bh + 1));
                const isCircular = ar > 0.6 && ar < 1.6 && fillRatio > 0.4;
                const type = isCircular ? 'connector' : 'module';
                const id = `component_${this.components.length}`;

                let el;
                if (isCircular) {
                    el = document.createElementNS(NS, 'circle');
                    el.setAttribute('cx', String((minX + maxX) / 2));
                    el.setAttribute('cy', String((minY + maxY) / 2));
                    el.setAttribute('r', String(Math.max(bw, bh) / 2));
                } else {
                    el = document.createElementNS(NS, 'rect');
                    el.setAttribute('x', String(minX)); el.setAttribute('y', String(minY));
                    el.setAttribute('width', String(bw)); el.setAttribute('height', String(bh));
                }
                el.setAttribute('fill', 'transparent');
                el.setAttribute('stroke', 'none');
                el.setAttribute('class', `canvas-component-overlay canvas-${type}`);
                el.setAttribute('data-component-id', id);
                this.$svgDisplay[0].appendChild(el);

                this.components.push({
                    element: el, $element: $(el), id,
                    bbox: { x: minX, y: minY, width: bw, height: bh }, type,
                });
            }
        }

        console.log(`Canvas analyzed: ${this.wires.length} wires, ${this.components.length} components`);
    },
});
