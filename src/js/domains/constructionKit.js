/* ============================================================
   Schematics Editor — Construction / Architectural Kit (Phase 2)
   Walls, doors, windows, stairs, dimension lines, room labels
   ============================================================ */

(function () {
    const STROKE_W = '2';
    const CLR      = '#4facfe';
    const WALL_CLR = '#00f2fe';

    const SYMBOLS = [
        // ── WALL (Horizontal) ────────────────────────────────
        {
            id: 'wall-h', label: 'Wall (H)', group: 'Structure',
            defaultValue: null,
            svgPreview: `<g transform="translate(5,20)">
                <rect width="55" height="10" fill="rgba(0,242,254,0.15)" stroke="${WALL_CLR}" stroke-width="${STROKE_W}"/>
            </g>`,
            svgContent: `
                <rect x="0" y="-6" width="120" height="12" fill="rgba(0,242,254,0.12)" stroke="${WALL_CLR}" stroke-width="2"/>
                <circle cx="0"   cy="0" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="start" data-pin-dir="0,1"/>
                <circle cx="120" cy="0" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="end" data-pin-dir="1,0"/>`,
        },
        // ── WALL (Vertical) ──────────────────────────────────
        {
            id: 'wall-v', label: 'Wall (V)', group: 'Structure',
            defaultValue: null,
            svgPreview: `<g transform="translate(20,5)">
                <rect width="10" height="42" fill="rgba(0,242,254,0.15)" stroke="${WALL_CLR}" stroke-width="${STROKE_W}"/>
            </g>`,
            svgContent: `
                <rect x="-6" y="0" width="12" height="120" fill="rgba(0,242,254,0.12)" stroke="${WALL_CLR}" stroke-width="2"/>
                <circle cx="0" cy="0"   r="3" fill="${WALL_CLR}" class="pin-point" data-pin="start" data-pin-dir="0,1"/>
                <circle cx="0" cy="120" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="end" data-pin-dir="0,1"/>`,
        },
        // ── DOOR (Swing) ─────────────────────────────────────
        {
            id: 'door-swing', label: 'Door (Swing)', group: 'Openings',
            defaultValue: null,
            svgPreview: `<g transform="translate(8,8)">
                <rect x="0" y="0" width="6" height="28" fill="rgba(0,242,254,0.12)" stroke="${WALL_CLR}" stroke-width="1.5"/>
                <line x1="6" y1="0" x2="34" y2="0" stroke="${CLR}" stroke-width="1.5"/>
                <path d="M 6 0 A 28 28 0 0 1 6 28" fill="none" stroke="${CLR}" stroke-width="1" stroke-dasharray="3,2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="-6" width="8" height="50" fill="rgba(0,242,254,0.12)" stroke="${WALL_CLR}" stroke-width="2"/>
                <line x1="8" y1="-6" x2="52" y2="-6" stroke="${CLR}" stroke-width="2"/>
                <path d="M 8 -6 A 44 44 0 0 1 8 38" fill="none" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="5,3"/>`,
        },
        // ── WINDOW ───────────────────────────────────────────
        {
            id: 'window', label: 'Window', group: 'Openings',
            defaultValue: null,
            svgPreview: `<g transform="translate(5,17)">
                <rect width="55" height="8" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <line x1="0" y1="4" x2="55" y2="4" stroke="${CLR}" stroke-width="1" stroke-dasharray="4,2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="-5" width="100" height="10" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <line x1="0" y1="0" x2="100" y2="0" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="6,3"/>`,
        },
        // ── STAIRS ───────────────────────────────────────────
        {
            id: 'stairs', label: 'Stairs', group: 'Structure',
            defaultValue: null,
            svgPreview: `<g transform="translate(5,5)">
                <rect width="55" height="38" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                ${Array.from({length:5},(_,i)=>`<line x1="0" y1="${i*7+4}" x2="55" y2="${i*7+4}" stroke="${CLR}" stroke-width="0.8"/>`).join('')}
                <line x1="10" y1="0" x2="10" y2="38" stroke="${CLR}" stroke-width="1.5" marker-end="url(#arrowFp)"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="80" height="60" fill="none" stroke="${CLR}" stroke-width="1.5"/>
                ${Array.from({length:7},(_,i)=>`<line x1="0" y1="${i*8+4}" x2="80" y2="${i*8+4}" stroke="${CLR}" stroke-width="0.8"/>`).join('')}
                <line x1="15" y1="0" x2="15" y2="60" stroke="${CLR}" stroke-width="2"/>
                <polygon points="10,8 15,0 20,8" fill="${CLR}"/>`,
        },
        // ── ROOM LABEL ───────────────────────────────────────
        {
            id: 'room-label', label: 'Room Label', group: 'Labels',
            defaultValue: 'Room',
            svgPreview: `<g transform="translate(5,12)">
                <rect width="55" height="20" rx="4" fill="rgba(79,172,254,0.08)" stroke="${CLR}" stroke-width="1"/>
                <text x="28" y="14" text-anchor="middle" font-size="9" fill="${CLR}" font-family="Inter,sans-serif">Room</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="90" height="32" rx="5" fill="rgba(79,172,254,0.07)" stroke="${CLR}" stroke-width="1.2"/>
                <text x="45" y="21" text-anchor="middle" font-size="13" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">Room</text>`,
        },
        // ── DIMENSION LINE ────────────────────────────────────
        {
            id: 'dimension', label: 'Dimension', group: 'Labels',
            defaultValue: '3000mm',
            svgPreview: `<g transform="translate(5,22)">
                <line x1="0" y1="0" x2="55" y2="0" stroke="${CLR}" stroke-width="1"/>
                <line x1="0" y1="-6" x2="0" y2="6" stroke="${CLR}" stroke-width="1.5"/>
                <line x1="55" y1="-6" x2="55" y2="6" stroke="${CLR}" stroke-width="1.5"/>
                <text x="28" y="-4" text-anchor="middle" font-size="7" fill="${CLR}" font-family="Inter,sans-serif">3000mm</text>
            </g>`,
            svgContent: `
                <line x1="0" y1="0" x2="120" y2="0" stroke="${CLR}" stroke-width="1.2"/>
                <line x1="0" y1="-8" x2="0" y2="8" stroke="${CLR}" stroke-width="2"/>
                <line x1="120" y1="-8" x2="120" y2="8" stroke="${CLR}" stroke-width="2"/>
                <text x="60" y="-6" text-anchor="middle" font-size="10" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">3000mm</text>`,
        },
        // ── ROOF / AREA ──────────────────────────────────────
        {
            id: 'roof-area', label: 'Roof/Area', group: 'Structure',
            svgPreview: `<g transform="translate(10,10)">
                <rect width="45" height="32" fill="none" stroke="${CLR}" stroke-width="1" stroke-dasharray="2,2"/>
                <line x1="0" y1="0" x2="45" y2="32" stroke="${CLR}" stroke-width="0.5" opacity=".5"/>
                <line x1="45" y1="0" x2="0" y2="32" stroke="${CLR}" stroke-width="0.5" opacity=".5"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="150" height="100" fill="none" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="5,5"/>
                <line x1="0" y1="0" x2="150" y2="100" stroke="${CLR}" stroke-width="0.8" opacity=".4"/>
                <line x1="150" y1="0" x2="0" y2="100" stroke="${CLR}" stroke-width="0.8" opacity=".4"/>`,
        },
        // ── SINK ──────────────────────────────────────────────
        {
            id: 'sink', label: 'Sink', group: 'Interior',
            svgPreview: `<g transform="translate(15,12)">
                <rect width="35" height="28" rx="4" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <circle cx="17.5" cy="14" r="8" fill="none" stroke="${CLR}" stroke-width="1"/>
                <circle cx="17.5" cy="5" r="2" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="70" height="60" rx="8" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <circle cx="35" cy="30" r="20" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <circle cx="35" cy="8" r="4" fill="${CLR}"/>`,
        },
        // ── TOILET ────────────────────────────────────────────
        {
            id: 'toilet', label: 'Toilet', group: 'Interior',
            svgPreview: `<g transform="translate(20,5)">
                <rect width="25" height="12" rx="2" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <path d="M 0,12 A 12,20 0 0 0 25,12" fill="none" stroke="${CLR}" stroke-width="1.2"/>
            </g>`,
            svgContent: `
                <rect x="10" y="0" width="40" height="20" rx="4" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <path d="M 0,20 Q 30,70 60,20" fill="none" stroke="${CLR}" stroke-width="1.8"/>`,
        },
        // ── SOFA ──────────────────────────────────────────────
        {
            id: 'sofa', label: 'Sofa', group: 'Interior',
            svgPreview: `<g transform="translate(5,15)">
                <rect width="55" height="22" rx="3" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <line x1="18" y1="0" x2="18" y2="22" stroke="${CLR}" stroke-width="1" opacity=".5"/>
                <line x1="37" y1="0" x2="37" y2="22" stroke="${CLR}" stroke-width="1" opacity=".5"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="120" height="50" rx="6" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <line x1="40" y1="0" x2="40" y2="50" stroke="${CLR}" stroke-width="1" opacity=".6"/>
                <line x1="80" y1="0" x2="80" y2="50" stroke="${CLR}" stroke-width="1" opacity=".6"/>
                <rect x="0" y="0" width="120" height="12" rx="2" fill="rgba(79,172,254,0.05)" stroke="${CLR}" stroke-width="1"/>`,
        },
        // ── COLUMN ────────────────────────────────────────────
        {
            id: 'column', label: 'Column', group: 'Structural',
            svgPreview: `<g transform="translate(20,10)">
                <rect width="25" height="25" fill="rgba(79,172,254,0.1)" stroke="${CLR}" stroke-width="1.5"/>
                <line x1="0" y1="0" x2="25" y2="25" stroke="${CLR}" stroke-width="0.8"/>
                <line x1="25" y1="0" x2="0" y2="25" stroke="${CLR}" stroke-width="0.8"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="40" height="40" fill="rgba(79,172,254,0.1)" stroke="${CLR}" stroke-width="2"/>
                <line x1="0" y1="0" x2="40" y2="40" stroke="${CLR}" stroke-width="1"/>
                <line x1="40" y1="0" x2="0" y2="40" stroke="${CLR}" stroke-width="1"/>`,
        },
        // ── BEAM ──────────────────────────────────────────────
        {
            id: 'beam', label: 'Beam', group: 'Structural',
            svgPreview: `<g transform="translate(5,22)">
                <line x1="0" y1="0" x2="55" y2="0" stroke="${CLR}" stroke-width="3" stroke-dasharray="8,4"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="0" x2="200" y2="0" stroke="${CLR}" stroke-width="6" stroke-dasharray="15,10"/>
                <circle cx="0"   cy="0" r="4" fill="${CLR}" class="pin-point" data-pin="start" data-pin-dir="0,1"/>
                <circle cx="200" cy="0" r="4" fill="${CLR}" class="pin-point" data-pin="end" data-pin-dir="1,0"/>`,
        },
        // ── BOILER / TANK ─────────────────────────────────────
        {
            id: 'boiler', label: 'Boiler/Tank', group: 'Mechanical',
            svgPreview: `<g transform="translate(20,8)">
                <circle cx="12" cy="12" r="12" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <rect x="9" y="24" width="6" height="8" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <circle cx="30" cy="30" r="30" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <rect x="22" y="60" width="16" height="15" fill="${CLR}"/>
                <path d="M 10,10 L 20,0 M 50,10 L 40,0" stroke="${CLR}" stroke-width="2"/>`,
        },
        // ── LIGHT FIXTURE ─────────────────────────────────────
        {
            id: 'light', label: 'Light Fixture', group: 'Electrical',
            svgPreview: `<g transform="translate(20,15)">
                <circle cx="12" cy="12" r="10" fill="none" stroke="${CLR}" stroke-width="1.2"/>
                <line x1="5" y1="5" x2="19" y2="19" stroke="${CLR}" stroke-width="1"/>
                <line x1="19" y1="5" x2="5" y2="19" stroke="${CLR}" stroke-width="1"/>
            </g>`,
            svgContent: `
                <circle cx="20" cy="20" r="20" fill="none" stroke="${CLR}" stroke-width="1.8"/>
                <line x1="6" y1="6" x2="34" y2="34" stroke="${CLR}" stroke-width="1.5"/>
                <line x1="34" y1="6" x2="6" y2="34" stroke="${CLR}" stroke-width="1.5"/>`,
        },
        // ── SPRINKLER ─────────────────────────────────────────
        {
            id: 'sprinkler', label: 'Sprinkler', group: 'Mechanical',
            svgPreview: `<g transform="translate(25,20)">
                <circle cx="8" cy="8" r="4" fill="${CLR}"/>
                <path d="M 8,8 L 0,0 M 8,8 L 16,0 M 8,8 L 8,16" stroke="${CLR}" stroke-width="1"/>
            </g>`,
            svgContent: `
                <circle cx="10" cy="10" r="6" fill="${CLR}"/>
                <path d="M 10,10 L -10,-10 M 10,10 L 30,-10 M 10,10 L 10,35 M -5,10 L 25,10" stroke="${CLR}" stroke-width="1.5" opacity=".7"/>`,
        },
        // ── SWIMMING POOL ─────────────────────────────────────
        {
            id: 'pool', label: 'Pool', group: 'Landscaping',
            svgPreview: `<g transform="translate(5,10)">
                <rect width="55" height="32" rx="8" fill="rgba(79,172,254,0.15)" stroke="${CLR}" stroke-width="1"/>
                <path d="M 10,10 Q 27,15 45,10" fill="none" stroke="${CLR}" stroke-width="0.5" opacity=".4"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="180" height="100" rx="20" fill="rgba(79,172,254,0.12)" stroke="${CLR}" stroke-width="1.8"/>
                <path d="M 20,20 Q 90,40 160,20 M 20,50 Q 90,70 160,50 M 20,80 Q 90,100 160,80" fill="none" stroke="${CLR}" stroke-width="0.8" opacity=".3"/>`,
        },
        // ── SCAFFOLDING ───────────────────────────────────────
        {
            id: 'scaffolding', label: 'Scaffolding', group: 'Temporary',
            svgPreview: `<g transform="translate(10,5)">
                <rect width="45" height="42" fill="none" stroke="${CLR}" stroke-width="1" stroke-dasharray="2,2"/>
                <line x1="0" y1="14" x2="45" y2="14" stroke="${CLR}" stroke-width="0.8"/>
                <line x1="0" y1="28" x2="45" y2="28" stroke="${CLR}" stroke-width="0.8"/>
                <line x1="15" y1="0" x2="15" y2="42" stroke="${CLR}" stroke-width="0.8"/>
                <line x1="30" y1="0" x2="30" y2="42" stroke="${CLR}" stroke-width="0.8"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="100" height="120" fill="none" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="4,4"/>
                <line x1="0" y1="40" x2="100" y2="40" stroke="${CLR}" stroke-width="1"/>
                <line x1="0" y1="80" x2="100" y2="80" stroke="${CLR}" stroke-width="1"/>
                <line x1="33" y1="0" x2="33" y2="120" stroke="${CLR}" stroke-width="1"/>
                <line x1="66" y1="0" x2="66" y2="120" stroke="${CLR}" stroke-width="1"/>`,
        },
    ];

    function registerConstruction() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('construction', {
            label:   'Construction',
            icon:    'material-symbols:architecture',
            symbols: SYMBOLS,
            exportOptions: ['svg', 'pdf', 'dxf'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerConstruction, 200));
    } else {
        setTimeout(registerConstruction, 200);
    }
})();
