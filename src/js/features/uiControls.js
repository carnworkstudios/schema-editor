/* ============================================================
   SVG Wiring Editor; UI Controls Feature
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

    _trackExport() {
        try {
            const n = parseInt(localStorage.getItem('schema_export_count') || '0', 10);
            localStorage.setItem('schema_export_count', String(n + 1));
        } catch (_) {}
    },

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
        this._trackExport();
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

    // ── CWS Netlist IPC ──────────────────────────────────────

    buildNetlistJson() {
        const name = this.displays[this.activeDisplayIdx]?.name || 'diagram';

        const components = this.components.map(comp => {
            const el = comp.element || comp.$element?.[0];
            const labelEl = el?.querySelector?.('text.sym-value');
            const label = labelEl?.textContent || '';

            let x = 0, y = 0;
            const tfm = el?.getAttribute?.('transform') || '';
            const m = tfm.match(/translate\(\s*([\d.+-]+)[,\s]+([\d.+-]+)\s*\)/);
            if (m) { x = parseFloat(m[1]); y = parseFloat(m[2]); }

            const ports = this.graph?.nodes?.get(comp.id)?.ports || comp.ports || [];

            return {
                id:         comp.id || '',
                refdes:     label,
                value:      label,
                symbolType: el?.getAttribute?.('data-symbol') || comp.type || 'unknown',
                domain:     el?.getAttribute?.('data-domain') || this.activeMode || '',
                x, y,
                ports: ports.map(p => ({ wireId: p.wireId || '', x: p.x || 0, y: p.y || 0 })),
                bbox: comp.bbox || {},
            };
        });

        const wireMap = new Map(this.wires.map(w => [w.id, w]));
        const connections = [...(this.graph?.edges?.values() || [])].map(edge => {
            const wire = wireMap.get(edge.id) || {};
            return {
                id:         edge.id || '',
                from:       edge.from || null,
                to:         edge.to   || null,
                color:      edge.color || wire.color || '',
                length:     edge.length ?? wire.length ?? 0,
                signalType: edge.signalType || null,
                linearity:  wire.linearity ?? null,
                endpoints:  wire.endpoints || [],
            };
        });

        return {
            schema:      'cws-netlist-v1',
            diagramName: name,
            exportedAt:  new Date().toISOString(),
            components,
            connections,
        };
    },

    // ── TAFNE Pipeline ───────────────────────────────────────────
    //
    //  Steps:
    //   0  Gather schema
    //   1  Check kernel heartbeat   (wake if sleeping)
    //   2  Probe TAFNE              (is table-formatter running?)
    //   3  Open TAFNE               (if not, ask kernel to launch it)
    //   4  Store data               (kernel pointer store)
    //   5  Deliver to TAFNE
    //
    async sendNetlistToTafne() {
        // ── Build netlist ──────────────────────────────────────
        const netlist = this.buildNetlistJson();
        if (!netlist.components.length && !netlist.connections.length) {
            this.showToast('No wiring data — run analysis first', 'error');
            return;
        }

        // ── Standalone (not inside OS shell) → download JSON ───
        if (!CwsBridge.isEmbedded) {
            const base = netlist.diagramName.replace(/\.[^.]+$/, '');
            this._triggerDownload(JSON.stringify(netlist, null, 2),
                `${base}__netlist.json`, 'application/json');
            this.showToast('Saved netlist JSON (not in OS shell)', 'success');
            return;
        }

        // ── Open pipeline modal ────────────────────────────────
        const pipeline = this._openTafnePipeline();

        try {
            // ── Step 0: Schema gathered ────────────────────────
            pipeline.step(0, 'done',
                `${netlist.components.length} components · ${netlist.connections.length} connections`);

            // ── Step 1: Kernel heartbeat ───────────────────────
            pipeline.step(1, 'running', 'Checking…');
            if (!CwsBridge.isConnected) {
                pipeline.step(1, 'running', 'Kernel sleeping — waking…');
                // Trigger the bridge's own reconnect handshake
                try { window.parent.postMessage({ type: 'cws:ready' }, '*'); } catch (_) {}
                const connected = await this._cwsWaitForConnection(8000);
                if (pipeline.cancelled) return;
                if (!connected) {
                    pipeline.step(1, 'error', 'Kernel offline');
                    pipeline.fail('Kernel did not respond. Make sure the Ginexys OS shell is open.');
                    return;
                }
            }
            pipeline.step(1, 'done', 'Connected');

            // ── Step 2: Probe TAFNE ────────────────────────────
            pipeline.step(2, 'running', 'Probing Table Formatter…');
            const tafneRunning = await this._cwsProbeTafne(3500);
            if (pipeline.cancelled) return;

            // ── Step 3: Open TAFNE if not running ─────────────
            if (tafneRunning) {
                pipeline.step(2, 'done', 'Already open');
                pipeline.step(3, 'skipped', 'Not needed');
            } else {
                pipeline.step(2, 'done', 'Not running');
                pipeline.step(3, 'running', 'Requesting kernel to open TAFNE…');
                CwsBridge.send('cws:tool:launch', { toolId: 'tifany', focusAfterLaunch: true }, 'os');
                const launched = await this._cwsWaitForToolLaunch('tifany', 12000);
                if (pipeline.cancelled) return;
                pipeline.step(3, launched ? 'done' : 'running',
                    launched ? 'TAFNE opened' : 'No ack — continuing anyway…');
            }

            // ── Step 4: Store data ─────────────────────────────
            pipeline.step(4, 'running', 'Storing netlist…');
            const pointerId = await CwsBridge.requestStore(JSON.stringify(netlist), 'json-data');
            if (pipeline.cancelled) return;
            pipeline.step(4, 'done', `ID: ${pointerId.slice(0, 10)}…`);

            // ── Step 5: Deliver ────────────────────────────────
            pipeline.step(5, 'running', 'Delivering…');
            CwsBridge.offerData(CwsContracts.createEnvelope({
                pointer:     pointerId,
                contentType: 'json-data',
                metadata: {
                    source:          'schema-editor',
                    diagramName:     netlist.diagramName,
                    componentCount:  netlist.components.length,
                    connectionCount: netlist.connections.length,
                },
                hints: { suggestedTarget: 'tifany', action: 'load-netlist' },
            }));
            this._trackExport();
            pipeline.step(5, 'done',
                `${netlist.components.length} components → TAFNE`);
            pipeline.success(`Sent ${netlist.components.length} components and ${netlist.connections.length} connections`);

        } catch (err) {
            pipeline.fail(err.message || 'Unexpected error');
        }
    },

    // ── Pipeline modal factory ────────────────────────────────
    _openTafnePipeline() {
        $('#tafnePipelineModal').remove();

        const STEPS = [
            'Gather schema',
            'Check kernel heartbeat',
            'Probe Table Formatter',
            'Open Table Formatter',
            'Store data',
            'Deliver to TAFNE',
        ];

        const stepsHtml = STEPS.map((label, i) => `
            <div class="tafne-step" data-idx="${i}" data-state="pending">
                <div class="tafne-step-icon pending">○</div>
                <div class="tafne-step-text">
                    <span class="tafne-step-label">${label}</span>
                    <span class="tafne-step-detail"></span>
                </div>
            </div>`).join('');

        const $modal = $(`
            <div class="modal-backdrop open" id="tafnePipelineModal" role="dialog" aria-modal="true">
                <div class="modal tafne-pipeline-modal">
                    <h3 class="modal-title">
                        <iconify-icon icon="material-symbols:send-outline" style="font-size:16px;"></iconify-icon>
                        Send to TAFNE
                    </h3>
                    <div class="tafne-steps">${stepsHtml}</div>
                    <div class="tafne-pipeline-footer info" id="tafnePipelineFooter">Initializing…</div>
                    <div class="modal-actions">
                        <button class="btn btn-ghost" id="tafnePipelineCancel">Cancel</button>
                        <button class="btn btn-ghost" id="tafnePipelineClose" style="display:none;">Close</button>
                    </div>
                </div>
            </div>`);

        $('body').append($modal);

        // Set first step immediately to running
        this._tafnePipelineStep(0, 'running', 'Building…');

        let _cancelled = false;
        let _currentRunningStep = -1;
        $('#tafnePipelineCancel').on('click', () => {
            _cancelled = true;
            $modal.remove();
        });
        $('#tafnePipelineClose').on('click', () => $modal.remove());

        const self = this;
        return {
            get cancelled() { return _cancelled; },
            step(idx, state, detail) {
                if (state === 'running') _currentRunningStep = idx;
                else if (_currentRunningStep === idx) _currentRunningStep = -1;
                self._tafnePipelineStep(idx, state, detail);
            },
            success(msg) {
                $('#tafnePipelineFooter').text(`✓ ${msg}`).attr('class', 'tafne-pipeline-footer success');
                $('#tafnePipelineCancel').hide();
                $('#tafnePipelineClose').show();
                setTimeout(() => $modal.remove(), 3000);
            },
            fail(msg) {
                if (_currentRunningStep >= 0) {
                    self._tafnePipelineStep(_currentRunningStep, 'error', msg);
                    _currentRunningStep = -1;
                }
                $('#tafnePipelineFooter').text(`✗ ${msg}`).attr('class', 'tafne-pipeline-footer error');
                $('#tafnePipelineCancel').hide();
                $('#tafnePipelineClose').show();
            },
        };
    },

    _tafnePipelineStep(idx, state, detail) {
        const $step = $(`#tafnePipelineModal .tafne-step[data-idx="${idx}"]`);
        if (!$step.length) return;
        const ICONS = { pending: '○', running: '', done: '✓', error: '✗', skipped: '–' };
        $step.attr('data-state', state);
        $step.find('.tafne-step-icon')
            .attr('class', `tafne-step-icon ${state}`)
            .text(ICONS[state] ?? '○');
        if (detail != null) $step.find('.tafne-step-detail').text(detail);
    },

    // ── CWS helpers ───────────────────────────────────────────

    _cwsWaitForConnection(timeout) {
        return new Promise(resolve => {
            if (CwsBridge.isConnected) { resolve(true); return; }
            const deadline = Date.now() + timeout;
            const timer = setInterval(() => {
                if (CwsBridge.isConnected) { clearInterval(timer); resolve(true); }
                else if (Date.now() >= deadline) { clearInterval(timer); resolve(false); }
            }, 250);
        });
    },

    // Sends cws:tool:probe to the kernel and waits for cws:tool:probe-result.
    // If kernel does not support the message type, resolves false after timeout.
    _cwsProbeTafne(timeout) {
        return new Promise(resolve => {
            let resolved = false;
            const probeId = typeof crypto !== 'undefined' ? crypto.randomUUID() : `probe_${Date.now()}`;

            const handler = (e) => {
                if (e.data?.type === 'cws:tool:probe-result' &&
                    e.data?.payload?.probeId === probeId) {
                    if (!resolved) {
                        resolved = true;
                        window.removeEventListener('message', handler);
                        resolve(e.data.payload.running === true);
                    }
                }
            };
            window.addEventListener('message', handler);
            CwsBridge.send('cws:tool:probe', { toolId: 'tifany', probeId }, 'os');

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    window.removeEventListener('message', handler);
                    resolve(false);
                }
            }, timeout);
        });
    },

    // Waits for a cws:tool:launch-ack from the kernel confirming the tool opened.
    _cwsWaitForToolLaunch(toolId, timeout) {
        return new Promise(resolve => {
            let resolved = false;
            const handler = (e) => {
                if ((e.data?.type === 'cws:tool:launch-ack' ||
                     e.data?.type === 'cws:lifecycle:registered') &&
                    (e.data?.payload?.toolId === toolId || !e.data?.payload?.toolId)) {
                    if (!resolved) {
                        resolved = true;
                        window.removeEventListener('message', handler);
                        resolve(true);
                    }
                }
            };
            window.addEventListener('message', handler);
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    window.removeEventListener('message', handler);
                    resolve(false);
                }
            }, timeout);
        });
    },

    async receiveBackAnnotation(envelope) {
        let raw;
        try {
            raw = envelope.pointer
                ? await CwsBridge.getStore(envelope.pointer)
                : envelope.inline;
        } catch (e) {
            this.showToast('Back-annotation: could not fetch data', 'error');
            return;
        }

        let incoming;
        try { incoming = typeof raw === 'string' ? JSON.parse(raw) : raw; }
        catch (e) { this.showToast('Back-annotation: invalid JSON', 'error'); return; }

        if (Array.isArray(incoming)) incoming = { components: incoming, connections: [] };
        if (!incoming?.components?.length) {
            this.showToast('Back-annotation: no component data', 'error');
            return;
        }

        const current = this.buildNetlistJson();
        const diff = this._diffNetlists(incoming, current);

        if (!diff.safe.length && !diff.review.length) {
            this.showToast('Back-annotate: no changes detected', 'success');
            return;
        }

        this._openBackAnnotateModal(diff);
    },

    // ── Diff engine ────────────────────────────────────────────
    _diffNetlists(incoming, current) {
        const safe   = [];
        const review = [];

        const currentById = new Map(current.components.map(c => [c.id, c]));
        const incomingById = new Map(incoming.components.map(c => [c.id, c]));
        const seen = new Set();

        for (const inc of incoming.components) {
            // Match by ID first, then by refdes as fallback
            let cur = currentById.get(inc.id);
            if (!cur && inc.refdes) {
                cur = current.components.find(c => c.refdes && c.refdes === inc.refdes) || null;
            }

            if (!cur) {
                review.push({ kind: 'added', component: inc });
                continue;
            }

            seen.add(cur.id);

            const valueChanged  = inc.value   && inc.value   !== cur.value;
            const refdesChanged = inc.refdes   && inc.refdes  !== cur.refdes;
            const typeChanged   = inc.symbolType && inc.symbolType !== cur.symbolType;

            if (typeChanged) {
                review.push({ kind: 'type_changed', id: cur.id,
                    refdes: cur.refdes || cur.id, from: cur.symbolType, to: inc.symbolType });
            }
            if (valueChanged) {
                safe.push({ kind: 'modified', id: cur.id,
                    refdes: cur.refdes || cur.id, field: 'value', from: cur.value, to: inc.value });
            }
            if (refdesChanged && !typeChanged) {
                safe.push({ kind: 'modified', id: cur.id,
                    refdes: cur.refdes || cur.id, field: 'refdes', from: cur.refdes, to: inc.refdes });
            }
        }

        // Components in current but absent in incoming → removed
        for (const cur of current.components) {
            if (!seen.has(cur.id) && !incomingById.has(cur.id)) {
                review.push({ kind: 'removed', component: cur });
            }
        }

        return { safe, review };
    },

    // ── Back-annotate validation modal ────────────────────────
    _openBackAnnotateModal(diff) {
        $('#backAnnotateModal').remove();

        const nSafe   = diff.safe.length;
        const nReview = diff.review.length;

        const safeRowsHtml = nSafe
            ? diff.safe.map(ch => `
                <div class="ba-row">
                    <span class="ba-tag safe">${ch.field}</span>
                    <span class="ba-desc">
                        <strong>${ch.refdes}</strong>
                        <span class="ba-from">${ch.from || '—'}</span>
                        <span class="ba-arrow">→</span>
                        <span class="ba-to">${ch.to}</span>
                    </span>
                </div>`).join('')
            : '<div class="ba-empty">No safe changes</div>';

        const reviewRowsHtml = nReview
            ? diff.review.map(ch => {
                if (ch.kind === 'added') return `
                    <div class="ba-row">
                        <span class="ba-tag added">new</span>
                        <span class="ba-desc"><strong>${ch.component.refdes || ch.component.id}</strong>
                        (${ch.component.symbolType || 'unknown'}) — not in schema</span>
                    </div>`;
                if (ch.kind === 'removed') return `
                    <div class="ba-row">
                        <span class="ba-tag removed">del</span>
                        <span class="ba-desc"><strong>${ch.component.refdes || ch.component.id}</strong>
                        removed in TAFNE</span>
                    </div>`;
                if (ch.kind === 'type_changed') return `
                    <div class="ba-row">
                        <span class="ba-tag conflict">type</span>
                        <span class="ba-desc"><strong>${ch.refdes}</strong>
                        ${ch.from} → ${ch.to}</span>
                    </div>`;
                return '';
            }).join('')
            : '<div class="ba-empty">None</div>';

        const $modal = $(`
            <div class="modal-backdrop open" id="backAnnotateModal" role="dialog" aria-modal="true">
                <div class="modal ba-modal">
                    <h3 class="modal-title">
                        <iconify-icon icon="material-symbols:undo" style="font-size:16px;"></iconify-icon>
                        Back-Annotate from TAFNE
                    </h3>
                    <p class="ba-summary">
                        ${nSafe + nReview} change${nSafe + nReview !== 1 ? 's' : ''} ·
                        <span class="ba-safe-ct">${nSafe} safe</span> ·
                        <span class="ba-review-ct">${nReview} need${nReview !== 1 ? '' : 's'} review</span>
                    </p>
                    ${nSafe ? `
                    <div class="ba-section">
                        <div class="ba-section-hdr safe">✓ Safe to apply (${nSafe})</div>
                        <div class="ba-rows">${safeRowsHtml}</div>
                    </div>` : ''}
                    ${nReview ? `
                    <div class="ba-section">
                        <div class="ba-section-hdr review">⚠ Needs review (${nReview})</div>
                        <div class="ba-rows">${reviewRowsHtml}</div>
                    </div>` : ''}
                    <div class="modal-actions">
                        <button class="btn btn-ghost" id="baDismissBtn">Dismiss</button>
                        ${nSafe ? `<button class="btn btn-primary" id="baApplyBtn">
                            Apply ${nSafe} safe change${nSafe !== 1 ? 's' : ''}
                        </button>` : ''}
                    </div>
                </div>
            </div>`);

        $('body').append($modal);
        $('#baDismissBtn').on('click', () => $modal.remove());

        if (nSafe) {
            const self = this;
            $('#baApplyBtn').on('click', () => {
                const applied = self._applyBackAnnotateChanges(diff.safe);
                $modal.remove();
                self.showToast(
                    applied ? `Back-annotated: ${applied} change${applied !== 1 ? 's' : ''} applied`
                            : 'Back-annotate: no matching elements found',
                    applied ? 'success' : 'error'
                );
            });
        }
    },

    // ── Apply safe back-annotate changes to SVG ───────────────
    _applyBackAnnotateChanges(safeChanges) {
        if (!safeChanges.length) return 0;

        const before = this._captureFullState?.();
        let applied = 0;

        safeChanges.forEach(ch => {
            const el = this._contentRoot?.querySelector(`g#${CSS.escape(ch.id)}[data-symbol]`);
            if (!el) return;
            const labelEl = el.querySelector('text.sym-value');
            if (!labelEl) return;
            labelEl.textContent = ch.to;
            applied++;
        });

        if (applied > 0 && typeof this.pushHistory === 'function') {
            const after = this._captureFullState?.();
            this.pushHistory('Back-annotate', before, after);
        }

        return applied;
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
        this.showToast(`Measure ON; tap two points (${this._measureUnit})`, 'success');

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
                this.showToast('Point 1 marked; tap second point', 'success');
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

    // ── ERD → SQL DDL export ─────────────────────────────────

    exportAsSqlDdl() {
        const name = this.displays[this.activeDisplayIdx]?.name || 'diagram';
        const entities = this._contentRoot
            ? Array.from(this._contentRoot.querySelectorAll('[data-symbol="entity"],[data-symbol="weak-entity"]'))
            : [];

        if (!entities.length) {
            this.showToast('No entities on canvas', 'error');
            return;
        }

        const colRx = /^(?:[🔑🔗]\s*)?(.+?)\s*:\s*(.+)$/u;

        const sql = entities.map(g => {
            const tableName = (g.querySelector('text.sym-value')?.textContent || 'unknown')
                .trim().replace(/\s+/g, '_').toLowerCase();
            const isWeak = g.dataset.symbol === 'weak-entity';

            const cols = Array.from(g.querySelectorAll('text.erd-col'))
                .map(t => t.textContent.trim())
                .filter(t => t && !t.startsWith('+'));

            const colDefs = cols.map(raw => {
                const icon = raw.startsWith('🔑') ? 'PK' : raw.startsWith('🔗') ? 'FK' : '';
                const m = colRx.exec(raw);
                if (!m) return `    -- (unparsed) ${raw}`;
                const colName = m[1].trim().replace(/\s+/g, '_').toLowerCase();
                let typePart = m[2].trim();
                const isPK   = icon === 'PK' || /\bPK\b/i.test(typePart);
                const isFK   = icon === 'FK' || /\bFK\b/i.test(typePart);
                const isNN   = isPK || /\bNN\b|NOT\s*NULL/i.test(typePart);
                const isUQ   = /\bUQ\b|UNIQUE/i.test(typePart);
                typePart = typePart.replace(/\b(PK|FK|NN|UQ|NOT\s*NULL|UNIQUE)\b/gi, '').trim();

                let def = `    ${colName} ${typePart}`;
                if (isNN)  def += ' NOT NULL';
                if (isUQ)  def += ' UNIQUE';
                if (isPK)  def += ' PRIMARY KEY';
                return def;
            });

            const comment = isWeak ? ' -- WEAK ENTITY' : '';
            return `CREATE TABLE ${tableName} (${comment}\n${colDefs.join(',\n')}\n);`;
        }).join('\n\n');

        const base = name.replace(/\.[^.]+$/, '');
        this._triggerDownload(sql, `${base}.sql`, 'text/plain;charset=utf-8');
        this.showToast(`SQL exported (${entities.length} table${entities.length > 1 ? 's' : ''})`, 'success');
    },

    // ── Sequence → Mermaid export ─────────────────────────────

    exportAsMermaidSequence() {
        const name = this.displays[this.activeDisplayIdx]?.name || 'diagram';
        const root = this._contentRoot;
        if (!root) { this.showToast('No canvas', 'error'); return; }

        const getX = g => {
            const m = (g.getAttribute('transform') || '').match(/translate\(\s*([\d.+-]+)/);
            return m ? parseFloat(m[1]) : 0;
        };
        const getY = g => {
            const m = (g.getAttribute('transform') || '').match(/translate\(\s*[\d.+-]+[,\s]+([\d.+-]+)/);
            return m ? parseFloat(m[1]) : 0;
        };
        const label = g => (g.querySelector('text.sym-value')?.textContent || '').trim();

        // Participants sorted left → right
        const actors = Array.from(root.querySelectorAll('[data-symbol="sq-actor"],[data-symbol="sq-system"]'))
            .sort((a, b) => getX(a) - getX(b));

        // Messages sorted top → bottom
        const messages = Array.from(root.querySelectorAll('[data-symbol="sq-message"],[data-symbol="sq-return"]'))
            .sort((a, b) => getY(a) - getY(b));

        const actorNames = actors.map((a, i) => label(a) || `P${i + 1}`);

        const resolveActor = (msgX, msgW = 150) => {
            const cx = msgX + msgW / 2;
            const srcX = msgX;
            const dstX = msgX + msgW;
            // Nearest actor to srcX = sender; nearest to dstX = receiver
            let src = actorNames[0], dst = actorNames[0];
            let srcDist = Infinity, dstDist = Infinity;
            actors.forEach((a, i) => {
                const ax = getX(a) + 60; // center of 120px box
                if (Math.abs(ax - srcX) < srcDist) { srcDist = Math.abs(ax - srcX); src = actorNames[i]; }
                if (Math.abs(ax - dstX) < dstDist) { dstDist = Math.abs(ax - dstX); dst = actorNames[i]; }
            });
            return { src, dst };
        };

        const lines = ['sequenceDiagram'];
        actorNames.forEach(n => lines.push(`    participant ${n}`));

        messages.forEach(g => {
            const isReturn = g.dataset.symbol === 'sq-return';
            const x = getX(g);
            const { src, dst } = resolveActor(x);
            const text = label(g) || (isReturn ? 'return' : 'message()');
            const arrow = isReturn ? `${src}-->${dst}` : `${src}->>${dst}`;
            lines.push(`    ${arrow}: ${text}`);
        });

        const base = name.replace(/\.[^.]+$/, '');
        this._triggerDownload(lines.join('\n'), `${base}.mmd`, 'text/plain;charset=utf-8');
        this.showToast(`Mermaid exported (${messages.length} message${messages.length !== 1 ? 's' : ''})`, 'success');
    },

    // ── FSM → JSON / XState export ───────────────────────────

    buildFsmJson() {
        const root = this._contentRoot;
        if (!root) return null;
        const name = this.displays[this.activeDisplayIdx]?.name || 'diagram';

        const getTransform = g => {
            const m = (g.getAttribute('transform') || '').match(/translate\(\s*([\d.+-]+)[,\s]+([\d.+-]+)/);
            return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
        };

        const stateEls = Array.from(root.querySelectorAll(
            '[data-symbol="fsm-state"],[data-symbol="fsm-initial"],[data-symbol="fsm-final"],[data-symbol="fsm-choice"],[data-symbol="fsm-composite"]'
        ));

        const states = stateEls.map(g => {
            const { x, y } = getTransform(g);
            return {
                id:   g.id || `state_${Math.random().toString(36).slice(2, 7)}`,
                name: (g.querySelector('text.sym-value')?.textContent || '').trim() || g.dataset.symbol,
                type: g.dataset.symbol.replace('fsm-', ''),
                x, y,
            };
        });

        // Transition labels (fsm-transition symbols provide event/action text near wires)
        const transitionLabels = Array.from(root.querySelectorAll('[data-symbol="fsm-transition"]'))
            .map(g => ({
                text: (g.querySelector('text.sym-value')?.textContent || '').trim(),
                ...getTransform(g),
            }));

        // Wires between states — read from this.wires if available
        const stateIds = new Set(states.map(s => s.id));
        const transitions = (this.wires || [])
            .filter(w => w.from && w.to && stateIds.has(w.from) && stateIds.has(w.to))
            .map((w, i) => {
                // Find nearest transition label by proximity to wire midpoint
                const fromState = states.find(s => s.id === w.from);
                const toState   = states.find(s => s.id === w.to);
                let event = '', action = '';
                if (fromState && toState && transitionLabels.length) {
                    const mx = (fromState.x + toState.x) / 2;
                    const my = (fromState.y + toState.y) / 2;
                    const nearest = transitionLabels.reduce((best, t) =>
                        Math.hypot(t.x - mx, t.y - my) < Math.hypot(best.x - mx, best.y - my) ? t : best
                    );
                    const parts = nearest.text.split('/').map(p => p.trim());
                    event  = parts[0] || '';
                    action = parts[1] || '';
                }
                return { id: w.id || `t_${i}`, from: w.from, to: w.to, event, action };
            });

        return { schema: 'cws-fsm-v1', name, states, transitions };
    },

    exportAsFsmJson() {
        const fsm = this.buildFsmJson();
        if (!fsm) { this.showToast('No canvas', 'error'); return; }
        if (!fsm.states.length) { this.showToast('No states on canvas', 'error'); return; }

        const base = fsm.name.replace(/\.[^.]+$/, '');
        this._triggerDownload(JSON.stringify(fsm, null, 2), `${base}__fsm.json`, 'application/json');
        this.showToast(`FSM JSON exported (${fsm.states.length} states)`, 'success');
    },

    exportAsXState() {
        const fsm = this.buildFsmJson();
        if (!fsm?.states.length) { this.showToast('No states on canvas', 'error'); return; }

        const initial = fsm.states.find(s => s.type === 'initial') || fsm.states[0];
        const stateMap = {};
        fsm.states
            .filter(s => s.type !== 'initial' && s.type !== 'final')
            .forEach(s => {
                const safeName = s.name.replace(/\s+/g, '_').toUpperCase();
                const ons = fsm.transitions
                    .filter(t => t.from === s.id)
                    .reduce((acc, t) => {
                        const target = fsm.states.find(st => st.id === t.to);
                        if (target) acc[t.event || 'NEXT'] = target.name.replace(/\s+/g, '_').toUpperCase();
                        return acc;
                    }, {});
                stateMap[safeName] = Object.keys(ons).length ? { on: ons } : {};
            });

        const xstateConfig = {
            id:      fsm.name.replace(/\s+/g, '_').toLowerCase(),
            initial: (initial.name || 'idle').replace(/\s+/g, '_').toUpperCase(),
            states:  stateMap,
        };

        const base = fsm.name.replace(/\.[^.]+$/, '');
        const code = `import { createMachine } from 'xstate';\n\nexport const machine = createMachine(${JSON.stringify(xstateConfig, null, 2)});\n`;
        this._triggerDownload(code, `${base}__machine.ts`, 'text/plain;charset=utf-8');
        this.showToast(`XState machine exported`, 'success');
    },

    async sendFsmToTafne() {
        const fsm = this.buildFsmJson();
        if (!fsm?.states.length) { this.showToast('No states on canvas', 'error'); return; }

        if (!CwsBridge.isEmbedded) {
            const base = fsm.name.replace(/\.[^.]+$/, '');
            this._triggerDownload(JSON.stringify(fsm, null, 2), `${base}__fsm.json`, 'application/json');
            this.showToast('Saved FSM JSON (not embedded)', 'success');
            return;
        }
        if (!CwsBridge.isConnected) {
            this.showToast('OS connection lost — reload the page', 'error');
            return;
        }
        try {
            this.showToast('Sending FSM to TAFNE…', 'success');
            const pointerId = await CwsBridge.requestStore(JSON.stringify(fsm), 'json-data');
            CwsBridge.offerData(CwsContracts.createEnvelope({
                pointer:     pointerId,
                contentType: 'json-data',
                metadata: {
                    source:      'schema-editor',
                    diagramName: fsm.name,
                    stateCount:  fsm.states.length,
                },
                hints: { suggestedTarget: 'tifany', action: 'load-fsm' },
            }));
            this._trackExport();
            this.showToast(`Sent ${fsm.states.length} states → TAFNE`, 'success');
        } catch (e) {
            this.showToast('Send failed: ' + e.message, 'error');
        }
    },
});
