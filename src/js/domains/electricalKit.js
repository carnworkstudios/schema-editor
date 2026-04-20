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
        // ── PNP TRANSISTOR ───────────────────────────────────
        {
            id: 'pnp', label: 'PNP', group: 'Semiconductors', geoClass: 'component',
            defaultValue: '2N3906', labelOffsetY: 40,
            pins: [{ x:-10, y:0 }, { x:10, y:-20 }, { x:10, y:20 }],
            svgPreview: `<g transform="translate(30,30)">
                <line x1="-20" y1="0" x2="0" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-18" x2="0" y2="18" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-10" x2="16" y2="-20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="10" x2="16" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="6,14 0,10 6,6" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <line x1="-20" y1="0" x2="0" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-18" x2="0" y2="18" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="0" y1="-10" x2="16" y2="-20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="10" x2="16" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="6,14 0,10 6,6" fill="${CLR}"/>
                <circle cx="-20" cy="0"  r="2" fill="${CLR}" class="pin-point" data-pin="base"/>
                <circle cx="16"  cy="-20" r="2" fill="${CLR}" class="pin-point" data-pin="collector"/>
                <circle cx="16"  cy="20"  r="2" fill="${CLR}" class="pin-point" data-pin="emitter"/>`,
        },
        // ── N-MOSFET ─────────────────────────────────────────
        {
            id: 'nmos', label: 'N-MOSFET', group: 'Semiconductors', geoClass: 'component',
            defaultValue: 'IRF540N', labelOffsetY: 40,
            pins: [{ x:-20, y:0 }, { x:20, y:-20 }, { x:20, y:20 }],
            svgPreview: `<g transform="translate(30,30)">
                <line x1="-20" y1="0" x2="-4" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-12" x2="-4" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-12" x2="2" y2="-6" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-3" x2="2" y2="3" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="6" x2="2" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-9" x2="20" y2="-9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="9" x2="20" y2="9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="0" x2="20" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="20" y1="-20" x2="20" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="12,-3 2,0 12,3" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <line x1="-20" y1="0" x2="-4" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-12" x2="-4" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-12" x2="2" y2="-6" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-3" x2="2" y2="3" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="6" x2="2" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-9" x2="20" y2="-9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="9" x2="20" y2="9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="0" x2="20" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="20" y1="-20" x2="20" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="12,-3 2,0 12,3" fill="${CLR}"/>
                <circle cx="-20" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="gate"/>
                <circle cx="20" cy="-20" r="2" fill="${CLR}" class="pin-point" data-pin="drain"/>
                <circle cx="20" cy="20" r="2" fill="${CLR}" class="pin-point" data-pin="source"/>`,
        },
        // ── P-MOSFET ─────────────────────────────────────────
        {
            id: 'pmos', label: 'P-MOSFET', group: 'Semiconductors', geoClass: 'component',
            defaultValue: 'IRF9540', labelOffsetY: 40,
            pins: [{ x:-20, y:0 }, { x:20, y:-20 }, { x:20, y:20 }],
            svgPreview: `<g transform="translate(30,30)">
                <line x1="-20" y1="0" x2="-4" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-12" x2="-4" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-12" x2="2" y2="-6" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-3" x2="2" y2="3" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="6" x2="2" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-9" x2="20" y2="-9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="9" x2="20" y2="9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="0" x2="20" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="20" y1="-20" x2="20" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="4,-3 14,0 4,3" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <line x1="-20" y1="0" x2="-4" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-12" x2="-4" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-12" x2="2" y2="-6" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-3" x2="2" y2="3" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="6" x2="2" y2="12" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="2" y1="-9" x2="20" y2="-9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="9" x2="20" y2="9" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="2" y1="0" x2="20" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="20" y1="-20" x2="20" y2="20" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="4,-3 14,0 4,3" fill="${CLR}"/>
                <circle cx="-20" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="gate"/>
                <circle cx="20" cy="-20" r="2" fill="${CLR}" class="pin-point" data-pin="drain"/>
                <circle cx="20" cy="20" r="2" fill="${CLR}" class="pin-point" data-pin="source"/>`,
        },
        // ── ZENER DIODE ───────────────────────────────────────
        {
            id: 'zener', label: 'Zener Diode', group: 'Semiconductors', geoClass: 'component',
            defaultValue: '1N4733A', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="-8" x2="12" y2="-12" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="8" x2="4" y2="12" stroke="${CLR}" stroke-width="2"/>
                ${wire(8,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="-8" x2="12" y2="-12" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="8" x2="4" y2="12" stroke="${CLR}" stroke-width="2"/>
                ${wire(8,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── SCHOTTKY DIODE ────────────────────────────────────
        {
            id: 'schottky', label: 'Schottky Diode', group: 'Semiconductors', geoClass: 'component',
            defaultValue: '1N5819', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="-8" x2="14" y2="-8" stroke="${CLR}" stroke-width="2"/>
                <line x1="14" y1="-8" x2="14" y2="-4" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="8" x2="2" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="2" y1="8" x2="2" y2="4" stroke="${CLR}" stroke-width="2"/>
                ${wire(8,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                <polygon points="-12,-8 -12,8 8,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="8" y1="-8" x2="8" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="-8" x2="14" y2="-8" stroke="${CLR}" stroke-width="2"/>
                <line x1="14" y1="-8" x2="14" y2="-4" stroke="${CLR}" stroke-width="2"/>
                <line x1="8" y1="8" x2="2" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="2" y1="8" x2="2" y2="4" stroke="${CLR}" stroke-width="2"/>
                ${wire(8,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── POLARIZED CAPACITOR ───────────────────────────────
        {
            id: 'cap-pol', label: 'Cap (Pol)', group: 'Passives', geoClass: 'component',
            defaultValue: '10uF', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-4,0)}
                <line x1="-4" y1="-9" x2="-4" y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M10,-9 Q4,0 10,9" fill="none" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <text x="-16" y="-6" font-size="8" fill="${CLR}">+</text>
                ${wire(7,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-4,0)}
                <line x1="-4" y1="-9" x2="-4" y2="9" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M10,-9 Q4,0 10,9" fill="none" stroke="${CLR}" stroke-width="2.5" stroke-linecap="round"/>
                <text x="-16" y="-6" font-size="8" fill="${CLR}">+</text>
                ${wire(7,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="+"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="-"/>`,
        },
        // ── BATTERY / DC SOURCE ───────────────────────────────
        {
            id: 'battery', label: 'Battery', group: 'Power', geoClass: 'component',
            defaultValue: '9V', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-6,0)}
                <line x1="-6" y1="-12" x2="-6" y2="12" stroke="${CLR}" stroke-width="2"/>
                <line x1="6" y1="-6" x2="6" y2="6" stroke="${CLR}" stroke-width="4"/>
                <text x="-18" y="-8" font-size="8" fill="${CLR}">+</text>
                ${wire(6,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-6,0)}
                <line x1="-6" y1="-12" x2="-6" y2="12" stroke="${CLR}" stroke-width="2"/>
                <line x1="6" y1="-6" x2="6" y2="6" stroke="${CLR}" stroke-width="4"/>
                <text x="-18" y="-8" font-size="8" fill="${CLR}">+</text>
                ${wire(6,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="+"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="-"/>`,
        },
        // ── AC SOURCE ─────────────────────────────────────────
        {
            id: 'ac-source', label: 'AC Source', group: 'Power', geoClass: 'component',
            defaultValue: '120VAC', labelOffsetY: 26,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                <circle cx="0" cy="0" r="12" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <path d="M-6,0 Q-3,-6 0,0 T6,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(12,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                <circle cx="0" cy="0" r="12" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <path d="M-6,0 Q-3,-6 0,0 T6,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(12,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="0"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>`,
        },
        // ── SPST SWITCH ───────────────────────────────────────
        {
            id: 'spst', label: 'SPST Switch', group: 'Switches', geoClass: 'component',
            defaultValue: 'SW1', labelOffsetY: 22,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                ${wire(20,0,30,0)}
                <circle cx="-10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="18" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-10" y1="0" x2="14" y2="-10" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-linecap="round"/>
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                ${wire(20,0,30,0)}
                <circle cx="-10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="18" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-10" y1="0" x2="14" y2="-10" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-linecap="round"/>
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="2"/>`,
        },
        // ── PUSHBUTTON ────────────────────────────────────────
        {
            id: 'pushbutton', label: 'Pushbutton', group: 'Switches', geoClass: 'component',
            defaultValue: 'PB1', labelOffsetY: 26,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-12,0)}
                ${wire(12,0,30,0)}
                <circle cx="-10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-10" y1="-8" x2="10" y2="-8" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-8" x2="0" y2="-14" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-14" x2="4" y2="-14" stroke="${CLR}" stroke-width="${STROKE_W}"/>
            </g>`,
            svgContent: `
                ${wire(-30,0,-12,0)}
                ${wire(12,0,30,0)}
                <circle cx="-10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="10" cy="0" r="2.5" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-10" y1="-8" x2="10" y2="-8" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="-8" x2="0" y2="-14" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="-4" y1="-14" x2="4" y2="-14" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="1"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="2"/>`,
        },
        // ── OP-AMP ────────────────────────────────────────────
        {
            id: 'opamp', label: 'Op-Amp', group: 'ICs', geoClass: 'component',
            defaultValue: 'LM358', labelOffsetY: 40,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-20,-10)}
                ${wire(-30,10,-20,10)}
                <polygon points="-20,-20 -20,20 20,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="-14" y="-6" font-size="8" fill="${CLR}">−</text>
                <text x="-14" y="14" font-size="8" fill="${CLR}">+</text>
                ${wire(20,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-20,-10)}
                ${wire(-30,10,-20,10)}
                <polygon points="-20,-20 -20,20 20,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="-14" y="-6" font-size="8" fill="${CLR}">−</text>
                <text x="-14" y="14" font-size="8" fill="${CLR}">+</text>
                ${wire(20,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in-"/>
                <circle cx="-30" cy="10"  r="2" fill="${CLR}" class="pin-point" data-pin="in+"/>
                <circle cx="30"  cy="0"   r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── AND GATE ──────────────────────────────────────────
        {
            id: 'gate-and', label: 'AND Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS08', labelOffsetY: 26,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-14,-16 L0,-16 A16,16 0 0,1 0,16 L-14,16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-14,-16 L0,-16 A16,16 0 0,1 0,16 L-14,16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in1"/>
                <circle cx="-30" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="in2"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── OR GATE ───────────────────────────────────────────
        {
            id: 'gate-or', label: 'OR Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS32', labelOffsetY: 26,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-10,-10)}
                ${wire(-30,10,-10,10)}
                <path d="M-16,-16 Q-4,0 -16,16 Q4,16 16,0 Q4,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-10,-10)}
                ${wire(-30,10,-10,10)}
                <path d="M-16,-16 Q-4,0 -16,16 Q4,16 16,0 Q4,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in1"/>
                <circle cx="-30" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="in2"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── NOT GATE ──────────────────────────────────────────
        {
            id: 'gate-not', label: 'NOT Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS04', labelOffsetY: 26,
            pins: [{ x:-20, y:0 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,0,-10,0)}
                <polygon points="-10,-12 -10,12 10,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="13" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,0,-10,0)}
                <polygon points="-10,-12 -10,12 10,0" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="13" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
                <circle cx="-30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="in"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── NAND GATE ─────────────────────────────────────────
        {
            id: 'gate-nand', label: 'NAND Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS00', labelOffsetY: 26,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-14,-16 L-2,-16 A16,16 0 0,1 -2,16 L-14,16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="17" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(20,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-14,-16 L-2,-16 A16,16 0 0,1 -2,16 L-14,16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="17" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(20,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in1"/>
                <circle cx="-30" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="in2"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── NOR GATE ──────────────────────────────────────────
        {
            id: 'gate-nor', label: 'NOR Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS02', labelOffsetY: 26,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-10,-10)}
                ${wire(-30,10,-10,10)}
                <path d="M-16,-16 Q-4,0 -16,16 Q2,16 12,0 Q2,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="15" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(18,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-10,-10)}
                ${wire(-30,10,-10,10)}
                <path d="M-16,-16 Q-4,0 -16,16 Q2,16 12,0 Q2,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="15" cy="0" r="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(18,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in1"/>
                <circle cx="-30" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="in2"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
        },
        // ── XOR GATE ──────────────────────────────────────────
        {
            id: 'gate-xor', label: 'XOR Gate', group: 'Logic', geoClass: 'component',
            defaultValue: '74LS86', labelOffsetY: 26,
            pins: [{ x:-20, y:-10 }, { x:-20, y:10 }, { x:20, y:0 }],
            svgPreview: `<g transform="translate(30,20)">
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-20,-16 Q-8,0 -20,16" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <path d="M-16,-16 Q-4,0 -16,16 Q4,16 16,0 Q4,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
            </g>`,
            svgContent: `
                ${wire(-30,-10,-14,-10)}
                ${wire(-30,10,-14,10)}
                <path d="M-20,-16 Q-8,0 -20,16" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <path d="M-16,-16 Q-4,0 -16,16 Q4,16 16,0 Q4,-16 -16,-16 Z" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                ${wire(16,0,30,0)}
                <circle cx="-30" cy="-10" r="2" fill="${CLR}" class="pin-point" data-pin="in1"/>
                <circle cx="-30" cy="10" r="2" fill="${CLR}" class="pin-point" data-pin="in2"/>
                <circle cx="30" cy="0" r="2" fill="${CLR}" class="pin-point" data-pin="out"/>`,
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
