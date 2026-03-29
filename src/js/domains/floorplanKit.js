/* ============================================================
   Schematics Editor — Floorplan / Architectural Kit (Phase 2)
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
                <circle cx="0"   cy="0" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="start"/>
                <circle cx="120" cy="0" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="end"/>`,
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
                <circle cx="0" cy="0"   r="3" fill="${WALL_CLR}" class="pin-point" data-pin="start"/>
                <circle cx="0" cy="120" r="3" fill="${WALL_CLR}" class="pin-point" data-pin="end"/>`,
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
        // ── FURNITURE: Generic ────────────────────────────────
        {
            id: 'furniture', label: 'Furniture', group: 'Furniture',
            defaultValue: 'Table',
            svgPreview: `<g transform="translate(5,8)">
                <rect width="55" height="28" rx="3" fill="rgba(79,172,254,0.05)" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="4,2"/>
                <text x="28" y="18" text-anchor="middle" font-size="7" fill="${CLR}" font-family="Inter,sans-serif">Table</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="80" height="50" rx="4" fill="rgba(79,172,254,0.04)" stroke="${CLR}" stroke-width="1.2" stroke-dasharray="6,3"/>
                <text x="40" y="29" text-anchor="middle" font-size="11" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">Table</text>`,
        },
    ];

    function registerFloorplan() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('floorplan', {
            label:   'Floorplan',
            icon:    'material-symbols:floor-lamp-outline',
            symbols: SYMBOLS,
            exportOptions: ['svg', 'pdf', 'dxf'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerFloorplan, 200));
    } else {
        setTimeout(registerFloorplan, 200);
    }
})();
