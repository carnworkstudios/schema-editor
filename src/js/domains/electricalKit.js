/* ============================================================
   Schematics Editor — Electrical / PCB Kit (Phase 2)
   ~12 standard schematic symbols, pin snapping, wire routing,
   component value labels, net label support
   ============================================================ */

(function () {
    /* ── SVG symbol definitions ──────────────────────────────
       All drawn in a 60×40 viewBox (normalised to translate(0,0))
       Stroke uses currentColor so dark/light mode works.
       Pin anchors are listed as [x,y] pairs.
    ─────────────────────────────────────────────────────── */

    const STROKE_W = '1.8';
    const CLR      = '#4facfe';

    function wire(x1,y1,x2,y2) {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-linecap="round"/>`;
    }

    const SYMBOLS = [
        // ── RESISTOR ────────────────────────────────────────
        {
            id: 'resistor', label: 'Resistor', group: 'Passives', geoClass: 'component',
            defaultValue: '10kΩ', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-20,0)}
                <rect x="-20" y="-5" width="40" height="10" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" rx="1"/>
                ${wire(20,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-20,0)}
                <rect x="-20" y="-5" width="40" height="10" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" rx="1"/>
                ${wire(20,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30"  cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── CAPACITOR ───────────────────────────────────────
        {
            id: 'capacitor', label: 'Capacitor', group: 'Passives', geoClass: 'component',
            defaultValue: '100nF', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-4,0)}
                <line x1="-4" y1="-9" x2="-4" y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="4"  y1="-9" x2="4"  y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                ${wire(4,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-4,0)}
                <line x1="-4" y1="-9" x2="-4" y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="4"  y1="-9" x2="4"  y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                ${wire(4,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30"  cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── INDUCTOR ────────────────────────────────────────
        {
            id: 'inductor', label: 'Inductor', group: 'Passives', geoClass: 'component',
            defaultValue: '10mH', labelOffsetY: 22,
            pins: [{ x:-30, y:0 }, { x:30, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-22,0)}
                <path d="M-22,0 Q-18,-10,-14,0 Q-10,-10,-6,0 Q-2,-10,2,0 Q6,-10,10,0 Q14,-10,18,0 Q22,-10,26,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-linecap="round"/>
                ${wire(26,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-22,0)}
                <path d="M-22,0 Q-18,-10,-14,0 Q-10,-10,-6,0 Q-2,-10,2,0 Q6,-10,10,0 Q14,-10,18,0 Q22,-10,26,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-linecap="round"/>
                ${wire(26,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30"  cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── DIODE ───────────────────────────────────────────
        {
            id: 'diode', label: 'Diode', group: 'Semiconductors', geoClass: 'component',
            defaultValue: '1N4148', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="${CLR}" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2" stroke-linecap="round"/>
                ${wire(8,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2" stroke-linecap="round"/>
                ${wire(8,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30"  cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── LED ─────────────────────────────────────────────
        {
            id: 'led', label: 'LED', group: 'Semiconductors', geoClass: 'component',
            defaultValue: 'LED', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="${CLR}" fill-opacity="0.3" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="12" y1="-10" x2="18" y2="-16" stroke="${CLR}" stroke-width="1.2" marker-end="url(#arrowE)"/>
                <line x1="16" y1="-6" x2="22" y2="-12" stroke="${CLR}" stroke-width="1.2" marker-end="url(#arrowE)"/>
                ${wire(8,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="12" y1="-10" x2="18" y2="-16" stroke="${CLR}" stroke-width="1.2"/>
                <line x1="16" y1="-6" x2="22" y2="-12" stroke="${CLR}" stroke-width="1.2"/>
                ${wire(8,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30"  cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── NPN TRANSISTOR ───────────────────────────────────
        {
            id: 'npn', label: 'NPN', group: 'Semiconductors', geoClass: 'component',
            defaultValue: '2N3904', labelOffsetY: 40,
            pins: [{ x:-10, y:0 }, { x:10, y:-20 }, { x:10, y:20 }],
            svgPreview: `<g transform="translate(30,30)">
                <line x1="-20" y1="0" x2="0" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-18" x2="0" y2="18" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-10" x2="16" y2="-20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="10" x2="16" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="10,14 16,20 10,18" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <line x1="-20" y1="0" x2="0" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-18" x2="0" y2="18" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-10" x2="16" y2="-20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="10" x2="16" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="10,14 16,20 10,18" fill="${CLR}"/>
                <circle cx="-20" cy="0"  r="2" fill="${CLR}" class="pin-point" data-pin="base"/>
                <circle cx="16"  cy="-20" r="2" fill="${CLR}" class="pin-point" data-pin="collector"/>
                <circle cx="16"  cy="20"  r="2" fill="${CLR}" class="pin-point" data-pin="emitter"/>`,
        },
        // ── IC GENERIC ──────────────────────────────────────
        {
            id: 'ic-generic', label: 'IC', group: 'ICs', geoClass: 'component',
            defaultValue: 'U1', labelOffsetY: 55,
            pins: [],
            svgPreview: `<g transform="translate(5,5)">
                <rect width="50" height="40" rx="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="25" y="23" text-anchor="middle" font-size="9" fill="${CLR}" font-family="monospace">IC</text>
                ${wire(-8,10,0,10)} ${wire(-8,20,0,20)} ${wire(-8,30,0,30)}
                ${wire(50,10,58,10)} ${wire(50,20,58,20)} ${wire(50,30,58,30)}
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="50" height="40" rx="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="25" y="24" text-anchor="middle" font-size="9" fill="${CLR}" font-family="monospace">IC</text>
                ${wire(-8,10,0,10)} ${wire(-8,20,0,20)} ${wire(-8,30,0,30)}
                ${wire(50,10,58,10)} ${wire(50,20,58,20)} ${wire(50,30,58,30)}
                <circle cx="-8" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="-8" cy="20" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>
                <circle cx="-8" cy="30" r="2" fill="${CLR}" class="pin-point" data-pin="2"/>
                <circle cx="58" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="3"/>
                <circle cx="58" cy="20" r="2" fill="${CLR}" class="pin-point" data-pin="4"/>
                <circle cx="58" cy="30" r="2" fill="${CLR}" class="pin-point" data-pin="5"/>`,
        },
        // ── GROUND ──────────────────────────────────────────
        {
            id: 'gnd', label: 'GND', group: 'Power', geoClass: 'component',
            defaultValue: null,
            pins: [{ x:0, y:-16 }],
            svgPreview: `<g transform="translate(30,10)">
                ${wire(0,-14,0,0)}
                <line x1="-14" y1="0" x2="14" y2="0" stroke="${CLR}" stroke-width="2"/>
                <line x1="-8" y1="5" x2="8" y2="5" stroke="${CLR}" stroke-width="1.5"/>
                <line x1="-3" y1="10" x2="3" y2="10" stroke="${CLR}" stroke-width="1"/>
            </g>`,
            svgContent: `
                ${wire(0,-16,0,0)}
                <line x1="-14" y1="0" x2="14" y2="0" stroke="${CLR}" stroke-width="2"/>
                <line x1="-8" y1="5" x2="8" y2="5" stroke="${CLR}" stroke-width="1.5"/>
                <line x1="-3" y1="10" x2="3" y2="10" stroke="${CLR}" stroke-width="1"/>
                <circle cx="0" cy="-16" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>`,
        },
        // ── VCC / POWER ──────────────────────────────────────
        {
            id: 'vcc', label: 'VCC', group: 'Power', geoClass: 'component',
            defaultValue: '+5V',
            pins: [{ x:0, y:16 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(0,14,0,5)}
                <polygon points="0,-10 -10,5 10,5" fill="${CLR}" fill-opacity="0.7" stroke="${CLR}" stroke-width="${STROKE_W}"/>
            </g>`,
            svgContent: `
                ${wire(0,16,0,5)}
                <polygon points="0,-10 -10,5 10,5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="0" cy="16" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>`,
        },
        // ── SWITCH / CONNECTOR ───────────────────────────────
        {
            id: 'connector', label: 'Connector', group: 'Connectors', geoClass: 'component',
            defaultValue: 'J1',
            pins: [{ x:-16, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                <circle cx="0" cy="0" r="12" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="0" cy="0" r="4"  fill="${CLR}"/>
                ${wire(-28,0,-12,0)}
            </g>`,
            svgContent: `
                <circle cx="0" cy="0" r="12" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="0" cy="0" r="4"  fill="${CLR}"/>
                ${wire(-28,0,-12,0)}
                <circle cx="-28" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>`,
        },
        // ── NET LABEL ────────────────────────────────────────
        {
            id: 'net-label', label: 'Net Label', group: 'Wiring', geoClass: 'junction',
            defaultValue: 'NET',
            pins: [{ x:-20, y:0 }],
            svgPreview: `<g transform="translate(10,20)">
                <polygon points="-10,-8 30,-8 38,0 30,8 -10,8" fill="rgba(79,172,254,0.15)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="10" y="4" text-anchor="middle" font-size="9" fill="${CLR}" font-family="monospace">NET</text>
            </g>`,
            svgContent: `
                <polygon points="-10,-8 30,-8 38,0 30,8 -10,8" fill="rgba(79,172,254,0.15)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="10" y="4" text-anchor="middle" font-size="9" fill="${CLR}" font-family="monospace" class="sym-value">NET</text>
                <circle cx="-10" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>`,
        },
    ];

    /* ── Domain behaviors ──────────────────────────────────── */

    function onElectricalActivate() {
        // Orthogonal wire routing is default; nothing extra needed for phase 2
        this.showToast('Electrical mode — Manhattan wiring', 'success');
    }

    function onElectricalDeactivate() {}

    /* ── Register ──────────────────────────────────────────── */
    function registerElectrical() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('electrical', {
            label:    'Electrical',
            icon:     'material-symbols:bolt',
            symbols:  SYMBOLS,
            onActivate:   onElectricalActivate,
            onDeactivate: onElectricalDeactivate,
            exportOptions: ['svg', 'kicad-netlist', 'gerber', 'bom-csv'],
        });
    }

    // Register once editor is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerElectrical, 200));
    } else {
        setTimeout(registerElectrical, 200);
    }
})();
