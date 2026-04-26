/* ============================================================
   Schematics Editor — General Domain Kit
   Basic Flowchart and Callout symbols
   ============================================================ */

(function () {
    const STROKE_W = '1.8';
    const CLR      = '#4facfe'; // ginexys blue
    const BG_CLR   = 'rgba(79,172,254,0.08)';

    const SYMBOLS = [
        // ── DECISION DIAMOND ──────────────────────────────────
        {
            id: 'decision', label: 'Decision', group: 'Flow',
            defaultValue: '?',
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(3,6)">
                <polygon points="30,2 58,22 30,42 2,22" fill="${BG_CLR}" stroke="${CLR}" stroke-width="1.2"/>
                <text x="30" y="26" text-anchor="middle" font-size="9" fill="${CLR}" font-family="Inter,sans-serif">?</text>
            </g>`,
            svgContent: `
                <polygon points="60,0 120,40 60,80 0,40" fill="${BG_CLR}" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="60" y="45" text-anchor="middle" font-size="14" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">?</text>
                <circle cx="0"   cy="40" r="4" class="pin-point" data-pin="left"   fill="${CLR}" opacity=".8"/>
                <circle cx="120" cy="40" r="4" class="pin-point" data-pin="right"  fill="${CLR}" opacity=".8"/>
                <circle cx="60"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${CLR}" opacity=".8"/>
                <circle cx="60"  cy="80" r="4" class="pin-point" data-pin="bottom" fill="${CLR}" opacity=".8"/>`,
        },
        // ── PROCESS BOX (Rounded) ─────────────────────────────
        {
            id: 'process', label: 'Process', group: 'Flow',
            defaultValue: 'Process',
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(5,12)">
                <rect width="55" height="28" rx="6" fill="${BG_CLR}" stroke="${CLR}" stroke-width="1.2"/>
                <text x="28" y="18" text-anchor="middle" font-size="7" fill="${CLR}" font-family="Inter,sans-serif">Process</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="120" height="50" rx="10" fill="${BG_CLR}" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="60" y="30" text-anchor="middle" font-size="12" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">Process</text>
                <circle cx="0"   cy="25" r="4" class="pin-point" data-pin="left"   fill="${CLR}" opacity=".8"/>
                <circle cx="120" cy="25" r="4" class="pin-point" data-pin="right"  fill="${CLR}" opacity=".8"/>
                <circle cx="60"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${CLR}" opacity=".8"/>
                <circle cx="60"  cy="50" r="4" class="pin-point" data-pin="bottom" fill="${CLR}" opacity=".8"/>`,
        },
        // ── STICKY NOTE ───────────────────────────────────────
        {
            id: 'note', label: 'Sticky Note', group: 'Callouts',
            defaultValue: 'Note...',
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(10,6)">
                <polygon points="0,0 45,0 45,30 35,40 0,40" fill="rgba(255,255,0,0.1)" stroke="#d4d400" stroke-width="1.2"/>
                <polygon points="35,30 45,30 35,40" fill="rgba(255,255,0,0.2)" stroke="#d4d400" stroke-width="0.8"/>
            </g>`,
            svgContent: `
                <polygon points="0,0 120,0 120,80 90,110 0,110" fill="rgba(255,255,0,0.08)" stroke="#d4d400" stroke-width="${STROKE_W}"/>
                <polygon points="90,80 120,80 90,110" fill="rgba(255,255,0,0.15)" stroke="#d4d400" stroke-width="1"/>
                <text x="10" y="30" font-size="12" fill="#888800" font-family="Inter,sans-serif" class="sym-value">Note...</text>`,
        },
        // ── SPEECH BUBBLE ─────────────────────────────────────
        {
            id: 'bubble', label: 'Speech Bubble', group: 'Callouts',
            defaultValue: 'Hello!',
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(5,5)">
                <path d="M 5,0 H 50 A 5,5 0 0 1 55,5 V 30 A 5,5 0 0 1 50,35 H 25 L 15,42 V 35 H 5 A 5,5 0 0 1 0,30 V 5 A 5,5 0 0 1 5,0 Z" fill="${BG_CLR}" stroke="${CLR}" stroke-width="1.2"/>
            </g>`,
            svgContent: `
                <path d="M 10,0 H 110 A 10,10 0 0 1 120,10 V 60 A 10,10 0 0 1 110,70 H 50 L 30,85 V 70 H 10 A 10,10 0 0 1 0,60 V 10 A 10,10 0 0 1 10,0 Z" fill="${BG_CLR}" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="60" y="40" text-anchor="middle" font-size="12" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">Hello!</text>`,
        },
    ];

    function registerGeneral() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('general', {
            label:   'General',
            icon:    'material-symbols:draw-outline',
            symbols: SYMBOLS,
            exportOptions: ['svg', 'png', 'pdf'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerGeneral, 200));
    } else {
        setTimeout(registerGeneral, 200);
    }
})();
