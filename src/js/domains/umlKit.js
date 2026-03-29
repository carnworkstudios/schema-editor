/* ============================================================
   Schematics Editor — UML / Software Architecture Kit (Phase 2)
   Class boxes, decision diamonds, flow shapes, connectors
   ============================================================ */

(function () {
    const STROKE_W = '1.8';
    const CLR      = '#4facfe';
    const CLR2     = '#00f2fe';

    function px(x1,y1,x2,y2) {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CLR}" stroke-width="${STROKE_W}"/>`;
    }

    const SYMBOLS = [
        // ── CLASS BOX ───────────────────────────────────────
        {
            id: 'class-box', label: 'Class', group: 'Structural',
            defaultValue: 'ClassName', labelOffsetY: -5,
            svgPreview: `<g transform="translate(5,5)">
                <rect width="55" height="38" rx="2" fill="rgba(79,172,254,0.08)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="13" x2="55" y2="13" stroke="${CLR}" stroke-width="1"/>
                <line x1="0" y1="26" x2="55" y2="26" stroke="${CLR}" stroke-width="1"/>
                <text x="28" y="10" text-anchor="middle" font-size="8" fill="${CLR}" font-weight="bold" font-family="Inter,sans-serif">Class</text>
                <text x="4"  y="21" font-size="6" fill="${CLR2}" font-family="monospace">+ attr: Type</text>
                <text x="4"  y="34" font-size="6" fill="${CLR2}" font-family="monospace">+ method()</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="100" height="70" rx="3" fill="rgba(79,172,254,0.07)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <line x1="0" y1="22" x2="100" y2="22" stroke="${CLR}" stroke-width="1"/>
                <line x1="0" y1="46" x2="100" y2="46" stroke="${CLR}" stroke-width="1"/>
                <text x="50" y="15" text-anchor="middle" font-size="11" fill="${CLR}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">ClassName</text>
                <text x="5"  y="36" font-size="8" fill="${CLR2}" font-family="monospace">+ attribute: Type</text>
                <text x="5"  y="60" font-size="8" fill="${CLR2}" font-family="monospace">+ method(): void</text>`,
        },
        // ── INTERFACE BOX ───────────────────────────────────
        {
            id: 'interface-box', label: 'Interface', group: 'Structural',
            defaultValue: 'IName', labelOffsetY: -5,
            svgPreview: `<g transform="translate(5,5)">
                <rect width="55" height="28" rx="2" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-dasharray="4,2"/>
                <text x="28" y="9" text-anchor="middle" font-size="6" fill="${CLR}" font-style="italic" font-family="Inter,sans-serif">«interface»</text>
                <line x1="0" y1="13" x2="55" y2="13" stroke="${CLR}" stroke-width="1" stroke-dasharray="3,2"/>
                <text x="28" y="23" text-anchor="middle" font-size="8" fill="${CLR2}" font-weight="bold" font-family="Inter,sans-serif">IName</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="100" height="50" rx="3" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-dasharray="6,3"/>
                <text x="50" y="14" text-anchor="middle" font-size="9" fill="${CLR}" font-style="italic" font-family="Inter,sans-serif">«interface»</text>
                <line x1="0" y1="20" x2="100" y2="20" stroke="${CLR}" stroke-width="1" stroke-dasharray="4,2"/>
                <text x="50" y="38" text-anchor="middle" font-size="12" fill="${CLR2}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">IName</text>`,
        },
        // ── PROCESS (Rectangle) ─────────────────────────────
        {
            id: 'process', label: 'Process', group: 'Flowchart',
            defaultValue: 'Process', labelOffsetY: -5,
            svgPreview: `<g transform="translate(5,12)">
                <rect width="55" height="20" rx="3" fill="rgba(79,172,254,0.1)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="28" y="14" text-anchor="middle" font-size="8" fill="${CLR}" font-family="Inter,sans-serif">Process</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="100" height="40" rx="4" fill="rgba(79,172,254,0.08)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="50" y="25" text-anchor="middle" font-size="12" fill="${CLR}" font-family="Inter,sans-serif" class="sym-value">Process</text>`,
        },
        // ── DECISION (Diamond) ───────────────────────────────
        {
            id: 'decision', label: 'Decision', group: 'Flowchart',
            defaultValue: 'Condition?', labelOffsetY: -5,
            svgPreview: `<g transform="translate(5,5)">
                <polygon points="27,2 53,20 27,38 1,20" fill="rgba(0,242,254,0.08)" stroke="${CLR2}" stroke-width="${STROKE_W}"/>
                <text x="27" y="23" text-anchor="middle" font-size="7" fill="${CLR2}" font-family="Inter,sans-serif">Yes/No</text>
            </g>`,
            svgContent: `
                <polygon points="50,0 100,30 50,60 0,30" fill="rgba(0,242,254,0.07)" stroke="${CLR2}" stroke-width="${STROKE_W}"/>
                <text x="50" y="34" text-anchor="middle" font-size="10" fill="${CLR2}" font-family="Inter,sans-serif" class="sym-value">Condition?</text>`,
        },
        // ── START / END (Terminal) ───────────────────────────
        {
            id: 'terminal', label: 'Start/End', group: 'Flowchart',
            defaultValue: 'Start', labelOffsetY: -5,
            svgPreview: `<g transform="translate(5,12)">
                <rect width="55" height="20" rx="10" fill="rgba(79,172,254,0.18)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="28" y="14" text-anchor="middle" font-size="8" fill="${CLR}" font-family="Inter,sans-serif">Start</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="100" height="40" rx="20" fill="rgba(79,172,254,0.15)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="50" y="25" text-anchor="middle" font-size="12" fill="${CLR}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">Start</text>`,
        },
        // ── NOTE ─────────────────────────────────────────────
        {
            id: 'note', label: 'Note', group: 'Structural',
            defaultValue: 'Note text…', labelOffsetY: -5,
            svgPreview: `<g transform="translate(4,4)">
                <polygon points="0,0 44,0 44,30 0,30" fill="rgba(255,215,0,0.08)" stroke="#ffa500" stroke-width="1.2"/>
                <polygon points="36,0 44,0 44,8" fill="rgba(255,165,0,0.15)" stroke="#ffa500" stroke-width="1"/>
                <text x="4" y="14" font-size="6" fill="#ffa500" font-family="Inter,sans-serif">Note text…</text>
            </g>`,
            svgContent: `
                <polygon points="0,0 80,0 80,50 0,50" fill="rgba(255,215,0,0.07)" stroke="#ffa500" stroke-width="1.5"/>
                <polygon points="62,0 80,0 80,18" fill="rgba(255,165,0,0.12)" stroke="#ffa500" stroke-width="1"/>
                <line x1="62" y1="0" x2="62" y2="18" stroke="#ffa500" stroke-width="1"/>
                <text x="8" y="22" font-size="9" fill="#ffa500" font-family="Inter,sans-serif" class="sym-value">Note text…</text>`,
        },
        // ── SWIMLANE ─────────────────────────────────────────
        {
            id: 'swimlane', label: 'Swimlane', group: 'Structural',
            defaultValue: 'Actor', labelOffsetY: -5,
            svgPreview: `<g transform="translate(3,3)">
                <rect width="18" height="44" fill="rgba(79,172,254,0.12)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <rect x="18" width="42" height="44" fill="rgba(79,172,254,0.03)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="9" y="26" text-anchor="middle" font-size="6" fill="${CLR}" font-family="Inter,sans-serif" transform="rotate(-90,9,26)">Actor</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="30" height="100" fill="rgba(79,172,254,0.12)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <rect x="30" y="0" width="120" height="100" fill="rgba(79,172,254,0.03)" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <text x="15" y="50" text-anchor="middle" font-size="11" fill="${CLR}" font-family="Inter,sans-serif" transform="rotate(-90,15,50)" class="sym-value">Actor</text>`,
        },
        // ── ARROW: Association ────────────────────────────────
        {
            id: 'arrow-assoc', label: 'Association', group: 'Connectors',
            defaultValue: null,
            svgPreview: `<g transform="translate(4,20)">
                <line x1="0" y1="0" x2="52" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="44,-5 56,0 44,5" fill="${CLR}"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="0" x2="80" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="70,-6 84,0 70,6" fill="${CLR}"/>
                <circle cx="0" cy="0" r="3" fill="${CLR}" class="pin-point" data-pin="start"/>`,
        },
        // ── ARROW: Inheritance (hollow head) ─────────────────
        {
            id: 'arrow-inherit', label: 'Inheritance', group: 'Connectors',
            defaultValue: null,
            svgPreview: `<g transform="translate(4,20)">
                <line x1="0" y1="0" x2="44" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="44,-6 56,0 44,6" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="0" x2="72" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <polygon points="72,-7 86,0 72,7" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="0" cy="0" r="3" fill="${CLR}" class="pin-point" data-pin="start"/>`,
        },
        // ── ARROW: Dependency (dashed) ───────────────────────
        {
            id: 'arrow-dep', label: 'Dependency', group: 'Connectors',
            defaultValue: null,
            svgPreview: `<g transform="translate(4,20)">
                <line x1="0" y1="0" x2="44" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-dasharray="5,3"/>
                <polygon points="44,-5 56,0 44,5" fill="none" stroke="${CLR}" stroke-width="1.2"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="0" x2="72" y2="0" stroke="${CLR}" stroke-width="${STROKE_W}" stroke-dasharray="7,4"/>
                <polygon points="72,-6 84,0 72,6" fill="none" stroke="${CLR}" stroke-width="${STROKE_W}"/>
                <circle cx="0" cy="0" r="3" fill="${CLR}" class="pin-point" data-pin="start"/>`,
        },
    ];

    function registerUML() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('uml', {
            label:   'UML',
            icon:    'material-symbols:schema-outline',
            symbols: SYMBOLS,
            exportOptions: ['svg', 'plantuml', 'mermaid', 'python'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerUML, 200));
    } else {
        setTimeout(registerUML, 200);
    }
})();
