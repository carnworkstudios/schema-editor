/* ============================================================
   Schematics Editor — Software Design Kit
   Consolidated ERD, FSM, and Sequence diagrams
   ============================================================ */

(function () {
    const SYMBOLS = [];

    // --- From erdKit.js ---
    (function() {
        const SW  = '1.8';
    const C   = '#48bb78';   // green-400
    const C2  = '#68d391';   // green-300
        const localSymbols = [
        // ── ENTITY ───────────────────────────────────────────────
        {
            id: 'entity', label: 'Entity', group: 'Tables',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 80 64',
            svgPreview: `<g transform="translate(5,5)">
                <rect width="70" height="22" rx="3" fill="rgba(72,187,120,.18)" stroke="${C}" stroke-width="1.2"/>
                <rect y="22" width="70" height="32" fill="rgba(72,187,120,.06)" stroke="${C}" stroke-width="1.2"/>
                <text x="35" y="15" text-anchor="middle" font-size="8" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">entity_name</text>
                <text x="4" y="33" font-size="6.5" fill="${C2}" font-family="monospace">🔑 id : INT PK</text>
                <text x="4" y="44" font-size="6.5" fill="${C2}" font-family="monospace">name : VARCHAR</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="160" height="26" rx="4" fill="rgba(72,187,120,.18)" stroke="${C}" stroke-width="${SW}" class="entity-header"/>
                <rect x="0" y="26" width="160" height="96" fill="rgba(72,187,120,.05)" stroke="${C}" stroke-width="${SW}" class="entity-body"/>
                <text x="80" y="17" text-anchor="middle" font-size="11" fill="${C}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">entity_name</text>
                <line x1="0" y1="44" x2="160" y2="44" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="39" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">🔑 id : INT PK</text>
                <line x1="0" y1="60" x2="160" y2="60" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="55" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">name : VARCHAR(255)</text>
                <line x1="0" y1="76" x2="160" y2="76" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="71" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">email : VARCHAR(255)</text>
                <line x1="0" y1="92" x2="160" y2="92" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="87" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">created : TIMESTAMP</text>
                <line x1="0" y1="108" x2="160" y2="108" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="103" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">+ add column…</text>
                <circle cx="0"   cy="61" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="160" cy="61" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="80"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="80"  cy="122" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── WEAK ENTITY ───────────────────────────────────────────
        {
            id: 'weak-entity', label: 'Weak Entity', group: 'Tables',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 80 56',
            svgPreview: `<g transform="translate(5,5)">
                <rect width="70" height="20" rx="3" fill="rgba(72,187,120,.1)" stroke="${C}" stroke-width="1.2" stroke-dasharray="4,2"/>
                <rect x="2" y="2" width="66" height="16" rx="2" fill="none" stroke="${C}" stroke-width=".7"/>
                <rect y="20" width="70" height="26" fill="rgba(72,187,120,.04)" stroke="${C}" stroke-width="1.2" stroke-dasharray="4,2"/>
                <text x="35" y="14" text-anchor="middle" font-size="7.5" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">weak_entity</text>
                <text x="4" y="32" font-size="6.5" fill="${C2}" font-family="monospace">🔗 parent_id : INT FK</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="160" height="26" rx="4" fill="rgba(72,187,120,.12)" stroke="${C}" stroke-width="${SW}" stroke-dasharray="6,3" class="entity-header"/>
                <rect x="3" y="3" width="154" height="20" rx="2" fill="none" stroke="${C}" stroke-width=".8"/>
                <rect x="0" y="26" width="160" height="78" fill="rgba(72,187,120,.04)" stroke="${C}" stroke-width="${SW}" stroke-dasharray="6,3" class="entity-body"/>
                <text x="80" y="17" text-anchor="middle" font-size="11" fill="${C}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">weak_entity</text>
                <line x1="0" y1="44" x2="160" y2="44" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="39" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">🔗 parent_id : INT FK</text>
                <line x1="0" y1="60" x2="160" y2="60" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="55" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">attr : VARCHAR(100)</text>
                <line x1="0" y1="76" x2="160" y2="76" stroke="${C}" stroke-width="0.5" opacity=".4"/>
                <text x="6" y="71" font-size="8.5" fill="${C2}" font-family="monospace" class="erd-col">+ add column…</text>
                <circle cx="0"   cy="52" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="160" cy="52" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="80"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="80"  cy="104" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── RELATIONSHIP DIAMOND ──────────────────────────────────
        {
            id: 'relationship', label: 'Relationship', group: 'Connectors',
            defaultValue: 'has',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(3,6)">
                <polygon points="30,2 58,22 30,42 2,22" fill="rgba(72,187,120,.1)" stroke="${C}" stroke-width="1.2"/>
                <text x="30" y="26" text-anchor="middle" font-size="7" fill="${C}" font-family="Inter,sans-serif">has</text>
            </g>`,
            svgContent: `
                <polygon points="60,0 120,40 60,80 0,40" fill="rgba(72,187,120,.08)" stroke="${C}" stroke-width="${SW}"/>
                <text x="60" y="45" text-anchor="middle" font-size="11" fill="${C}" font-family="Inter,sans-serif" class="sym-value">has</text>
                <circle cx="0"   cy="40" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="120" cy="40" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="60"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="60"  cy="80" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── CROW'S FOOT: One-to-One ───────────────────────────────
        {
            id: 'cf-one-one', label: '1:1', group: 'Cardinality',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(5,14)">
                <line x1="0" y1="6" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="12" y1="0" x2="12" y2="12" stroke="${C}" stroke-width="1.5"/>
                <line x1="42" y1="0" x2="42" y2="12" stroke="${C}" stroke-width="1.5"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="18" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="18" y1="6" x2="18" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <line x1="82" y1="6" x2="82" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="0"   cy="18" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="100" cy="18" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── CROW'S FOOT: One-to-Many ──────────────────────────────
        {
            id: 'cf-one-many', label: '1:N', group: 'Cardinality',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(5,14)">
                <line x1="0" y1="6" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="12" y1="0" x2="12" y2="12" stroke="${C}" stroke-width="1.5"/>
                <line x1="41" y1="0" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="41" y1="12" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="44" y1="0" x2="44" y2="12" stroke="${C}" stroke-width="1.5"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="18" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="18" y1="6" x2="18" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <line x1="76" y1="4" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="76" y1="32" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="82" y1="6" x2="82" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="0"   cy="18" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="100" cy="18" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── CROW'S FOOT: Zero-or-One ──────────────────────────────
        {
            id: 'cf-zero-one', label: '0..1', group: 'Cardinality',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(5,14)">
                <line x1="0" y1="6" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <circle cx="12" cy="6" r="5" fill="none" stroke="${C}" stroke-width="1.2"/>
                <line x1="42" y1="0" x2="42" y2="12" stroke="${C}" stroke-width="1.5"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="18" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="22" cy="18" r="7" fill="rgba(72,187,120,.08)" stroke="${C}" stroke-width="${SW}"/>
                <line x1="82" y1="6" x2="82" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="0"   cy="18" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="100" cy="18" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── CROW'S FOOT: Zero-or-Many ─────────────────────────────
        {
            id: 'cf-zero-many', label: '0..N', group: 'Cardinality',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(5,14)">
                <line x1="0" y1="6" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <circle cx="14" cy="6" r="5" fill="none" stroke="${C}" stroke-width="1.2"/>
                <line x1="41" y1="0" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="41" y1="12" x2="55" y2="6" stroke="${C}" stroke-width="1.5"/>
                <line x1="44" y1="0" x2="44" y2="12" stroke="${C}" stroke-width="1.5"/>
            </g>`,
            svgContent: `
                <line x1="0" y1="18" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="22" cy="18" r="7" fill="rgba(72,187,120,.08)" stroke="${C}" stroke-width="${SW}"/>
                <line x1="76" y1="4" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="76" y1="32" x2="100" y2="18" stroke="${C}" stroke-width="${SW}"/>
                <line x1="82" y1="6" x2="82" y2="30" stroke="${C}" stroke-width="${SW}"/>
                <circle cx="0"   cy="18" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="100" cy="18" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── NOTE ──────────────────────────────────────────────────
        {
            id: 'erd-note', label: 'Note', group: 'Annotations',
            defaultValue: 'note…',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(4,4)">
                <polygon points="0,0 50,0 50,40 0,40" fill="rgba(72,187,120,.07)" stroke="${C}" stroke-width="1"/>
                <polygon points="36,0 50,0 50,14" fill="rgba(72,187,120,.15)" stroke="${C}" stroke-width="1"/>
                <line x1="36" y1="0" x2="36" y2="14" stroke="${C}" stroke-width="1"/>
                <text x="5" y="26" font-size="6.5" fill="${C2}" font-family="Inter,sans-serif">note…</text>
            </g>`,
            svgContent: `
                <polygon points="0,0 100,0 100,60 0,60" fill="rgba(72,187,120,.06)" stroke="${C}" stroke-width="${SW}"/>
                <polygon points="76,0 100,0 100,24" fill="rgba(72,187,120,.14)" stroke="${C}" stroke-width="1"/>
                <line x1="76" y1="0" x2="76" y2="24" stroke="${C}" stroke-width="1"/>
                <text x="8" y="28" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">note…</text>`,
        },
    ];
        SYMBOLS.push(...localSymbols);
    })();

    // --- From fsmKit.js ---
    (function() {
        const SW  = '1.8';
    const C   = '#9f7aea';   // purple-400
    const C2  = '#b794f4';   // purple-300
        const localSymbols = [
        // ── STATE ─────────────────────────────────────────────────
        {
            id: 'fsm-state', label: 'State', group: 'States',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(5,11)">
                <rect width="55" height="30" rx="8" fill="rgba(159,122,234,.15)" stroke="${C}" stroke-width="1.2"/>
                <text x="27" y="20" text-anchor="middle" font-size="8" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">Idle</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="130" height="50" rx="12" fill="rgba(159,122,234,.13)" stroke="${C}" stroke-width="${SW}" class="fsm-state-box"/>
                <text x="65" y="30" text-anchor="middle" font-size="13" fill="${C}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">Idle</text>
                <circle cx="0"   cy="25" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="130" cy="25" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="65"  cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="65"  cy="50" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── INITIAL STATE (filled circle) ─────────────────────────
        {
            id: 'fsm-initial', label: 'Initial', group: 'States',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 40 40',
            svgPreview: `<g transform="translate(10,10)">
                <circle cx="10" cy="10" r="9" fill="${C}"/>
            </g>`,
            svgContent: `
                <circle cx="20" cy="20" r="18" fill="${C}" class="fsm-initial-circle"/>
                <circle cx="20" cy="20" r="4"  fill="rgba(255,255,255,.9)"/>
                <circle cx="20" cy="38" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>
                <circle cx="38" cy="20" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>`,
        },

        // ── FINAL STATE (double circle) ───────────────────────────
        {
            id: 'fsm-final', label: 'Final', group: 'States',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 46 46',
            svgPreview: `<g transform="translate(3,3)">
                <circle cx="20" cy="20" r="18" fill="none" stroke="${C}" stroke-width="1.5"/>
                <circle cx="20" cy="20" r="12" fill="${C}" opacity=".85"/>
            </g>`,
            svgContent: `
                <circle cx="24" cy="24" r="22" fill="none" stroke="${C}" stroke-width="${SW}" class="fsm-final-outer"/>
                <circle cx="24" cy="24" r="15" fill="${C}" opacity=".85" class="fsm-final-inner"/>
                <circle cx="24" cy="46" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>
                <circle cx="2"  cy="24" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>`,
        },

        // ── CHOICE (diamond) ──────────────────────────────────────
        {
            id: 'fsm-choice', label: 'Choice', group: 'States',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 52 52',
            svgPreview: `<g transform="translate(3,3)">
                <polygon points="23,2 44,22 23,42 2,22" fill="rgba(159,122,234,.12)" stroke="${C}" stroke-width="1.3"/>
            </g>`,
            svgContent: `
                <polygon points="46,0 92,46 46,92 0,46" fill="rgba(159,122,234,.1)" stroke="${C}" stroke-width="${SW}" class="fsm-choice-diamond"/>
                <circle cx="0"  cy="46" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="92" cy="46" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="46" cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="46" cy="92" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── COMPOSITE STATE (has sub-states) ──────────────────────
        {
            id: 'fsm-composite', label: 'Composite', group: 'States',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(4,4)">
                <rect width="56" height="43" rx="8" fill="rgba(159,122,234,.08)" stroke="${C}" stroke-width="1.2"/>
                <rect x="4" y="12" width="22" height="14" rx="4" fill="rgba(159,122,234,.18)" stroke="${C}" stroke-width=".8"/>
                <rect x="30" y="12" width="22" height="14" rx="4" fill="rgba(159,122,234,.18)" stroke="${C}" stroke-width=".8"/>
                <text x="28" y="9" text-anchor="middle" font-size="6" fill="${C}" font-family="Inter,sans-serif">Composite</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="200" height="120" rx="12" fill="rgba(159,122,234,.07)" stroke="${C}" stroke-width="${SW}" stroke-dasharray="8,4" class="fsm-composite-box"/>
                <text x="100" y="16" text-anchor="middle" font-size="10" fill="${C}" font-family="Inter,sans-serif" class="sym-value">Composite</text>
                <line x1="0" y1="22" x2="200" y2="22" stroke="${C}" stroke-width="1" opacity=".5"/>
                <circle cx="0"   cy="60" r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="200" cy="60" r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>
                <circle cx="100" cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="100" cy="120" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── TRANSITION LABEL (annotates a wire) ───────────────────
        {
            id: 'fsm-transition', label: 'Transition', group: 'Labels',
            defaultValue: 'event / action',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 28',
            svgPreview: `<g transform="translate(4,6)">
                <rect width="56" height="16" rx="3" fill="rgba(159,122,234,.1)" stroke="${C}" stroke-width="1" stroke-dasharray="3,2"/>
                <text x="28" y="11" text-anchor="middle" font-size="6.5" fill="${C2}" font-family="monospace">event / action</text>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="140" height="24" rx="4" fill="rgba(159,122,234,.1)" stroke="${C}" stroke-width="1.2" stroke-dasharray="5,3" class="fsm-label-box"/>
                <text x="70" y="16" text-anchor="middle" font-size="10" fill="${C2}" font-family="monospace" class="sym-value">event / action</text>`,
        },

        // ── NOTE ──────────────────────────────────────────────────
        {
            id: 'fsm-note', label: 'Note', group: 'Annotations',
            defaultValue: 'note…',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(4,4)">
                <polygon points="0,0 50,0 50,40 0,40" fill="rgba(159,122,234,.07)" stroke="${C}" stroke-width="1"/>
                <polygon points="36,0 50,0 50,14" fill="rgba(159,122,234,.15)" stroke="${C}" stroke-width="1"/>
                <line x1="36" y1="0" x2="36" y2="14" stroke="${C}" stroke-width="1"/>
                <text x="5" y="26" font-size="6.5" fill="${C2}" font-family="Inter,sans-serif">note…</text>
            </g>`,
            svgContent: `
                <polygon points="0,0 100,0 100,60 0,60" fill="rgba(159,122,234,.06)" stroke="${C}" stroke-width="${SW}"/>
                <polygon points="76,0 100,0 100,24" fill="rgba(159,122,234,.14)" stroke="${C}" stroke-width="1"/>
                <line x1="76" y1="0" x2="76" y2="24" stroke="${C}" stroke-width="1"/>
                <text x="8" y="28" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">note…</text>`,
        },
    ];
        SYMBOLS.push(...localSymbols);
    })();

    // --- From sequenceKit.js ---
    (function() {
        const SW  = '1.8';
    const C   = '#ed8936';   // orange-400
    const C2  = '#f6ad55';   // orange-300
        const localSymbols = [
        // ── ACTOR / PARTICIPANT ───────────────────────────────────
        {
            id: 'sq-actor', label: 'Actor', group: 'Participants',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(7,4)">
                <rect width="50" height="22" rx="3" fill="rgba(237,137,54,.15)" stroke="${C}" stroke-width="1.2"/>
                <text x="25" y="15" text-anchor="middle" font-size="8" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">Actor</text>
                <line x1="25" y1="22" x2="25" y2="42" stroke="${C}" stroke-width="1" stroke-dasharray="3,2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="120" height="32" rx="4" fill="rgba(237,137,54,.14)" stroke="${C}" stroke-width="${SW}" class="sq-participant-box"/>
                <text x="60" y="21" text-anchor="middle" font-size="12" fill="${C}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">Actor</text>
                <line x1="60" y1="32" x2="60" y2="200" stroke="${C}" stroke-width="1.2" stroke-dasharray="6,4" class="sq-lifeline"/>
                <circle cx="60"  cy="0"   r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="60"  cy="200" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>
                <circle cx="0"   cy="16"  r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="120" cy="16"  r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>`,
        },

        // ── SYSTEM / EXTERNAL PARTICIPANT ────────────────────────
        {
            id: 'sq-system', label: 'System', group: 'Participants',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(7,4)">
                <rect width="50" height="22" rx="1" fill="rgba(237,137,54,.1)" stroke="${C}" stroke-width="1.2" stroke-dasharray="4,2"/>
                <text x="25" y="15" text-anchor="middle" font-size="8" fill="${C2}" font-weight="bold" font-family="Inter,sans-serif">System</text>
                <line x1="25" y1="22" x2="25" y2="42" stroke="${C}" stroke-width="1" stroke-dasharray="3,2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="120" height="32" rx="1" fill="rgba(237,137,54,.08)" stroke="${C}" stroke-width="${SW}" stroke-dasharray="6,3" class="sq-participant-box"/>
                <text x="60" y="21" text-anchor="middle" font-size="12" fill="${C2}" font-weight="bold" font-family="Inter,sans-serif" class="sym-value">System</text>
                <line x1="60" y1="32" x2="60" y2="200" stroke="${C}" stroke-width="1.2" stroke-dasharray="6,4" class="sq-lifeline"/>
                <circle cx="60"  cy="0"   r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="60"  cy="200" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>
                <circle cx="0"   cy="16"  r="4" class="pin-point" data-pin="left"   fill="${C}" opacity=".8"/>
                <circle cx="120" cy="16"  r="4" class="pin-point" data-pin="right"  fill="${C}" opacity=".8"/>`,
        },

        // ── ACTIVATION BAR ────────────────────────────────────────
        {
            id: 'sq-activation', label: 'Activation', group: 'Lifeline',
            defaultValue: null,
            geoClass: 'component',
            previewViewBox: '0 0 30 52',
            svgPreview: `<g transform="translate(10,4)">
                <rect width="10" height="44" rx="2" fill="rgba(237,137,54,.25)" stroke="${C}" stroke-width="1.2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="16" height="80" rx="3" fill="rgba(237,137,54,.22)" stroke="${C}" stroke-width="${SW}" class="sq-activation-bar"/>
                <circle cx="8" cy="0"  r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="8" cy="80" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── SYNC MESSAGE (solid arrow) ────────────────────────────
        {
            id: 'sq-message', label: 'Message', group: 'Messages',
            defaultValue: 'message()',
            labelOffsetY: -8,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(3,12)">
                <line x1="0" y1="8" x2="52" y2="8" stroke="${C}" stroke-width="1.5"/>
                <polygon points="44,2 58,8 44,14" fill="${C}"/>
                <text x="26" y="5" text-anchor="middle" font-size="6" fill="${C2}" font-family="Inter,sans-serif">message()</text>
            </g>`,
            svgContent: `
                <line x1="0" y1="14" x2="150" y2="14" stroke="${C}" stroke-width="${SW}" class="sq-msg-line"/>
                <polygon points="136,6 152,14 136,22" fill="${C}" class="sq-msg-head"/>
                <text x="75" y="10" text-anchor="middle" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">message()</text>
                <circle cx="0"   cy="14" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="150" cy="14" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── RETURN MESSAGE (dashed arrow) ─────────────────────────
        {
            id: 'sq-return', label: 'Return', group: 'Messages',
            defaultValue: 'return',
            labelOffsetY: -8,
            geoClass: 'component',
            previewViewBox: '0 0 65 40',
            svgPreview: `<g transform="translate(3,12)">
                <line x1="0" y1="8" x2="52" y2="8" stroke="${C}" stroke-width="1.5" stroke-dasharray="5,3"/>
                <polygon points="44,2 58,8 44,14" fill="none" stroke="${C}" stroke-width="1.2"/>
                <text x="26" y="5" text-anchor="middle" font-size="6" fill="${C2}" font-family="Inter,sans-serif">return</text>
            </g>`,
            svgContent: `
                <line x1="0" y1="14" x2="150" y2="14" stroke="${C}" stroke-width="${SW}" stroke-dasharray="8,4" class="sq-return-line"/>
                <polygon points="136,6 152,14 136,22" fill="none" stroke="${C}" stroke-width="${SW}" class="sq-return-head"/>
                <text x="75" y="10" text-anchor="middle" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">return</text>
                <circle cx="0"   cy="14" r="4" class="pin-point" data-pin="left"  fill="${C}" opacity=".8"/>
                <circle cx="150" cy="14" r="4" class="pin-point" data-pin="right" fill="${C}" opacity=".8"/>`,
        },

        // ── SELF-CALL ─────────────────────────────────────────────
        {
            id: 'sq-self', label: 'Self-call', group: 'Messages',
            defaultValue: 'self()',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(8,8)">
                <path d="M0,6 H28 V26 H0" fill="none" stroke="${C}" stroke-width="1.5"/>
                <polygon points="0,20 0,32 8,26" fill="${C}"/>
                <text x="14" y="3" text-anchor="middle" font-size="6" fill="${C2}" font-family="Inter,sans-serif">self()</text>
            </g>`,
            svgContent: `
                <path d="M0,10 H50 V40 H0" fill="none" stroke="${C}" stroke-width="${SW}" class="sq-self-line"/>
                <polygon points="0,32 0,48 10,40" fill="${C}" class="sq-self-head"/>
                <text x="26" y="8" text-anchor="middle" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">self()</text>
                <circle cx="0" cy="10" r="4" class="pin-point" data-pin="top"    fill="${C}" opacity=".8"/>
                <circle cx="0" cy="40" r="4" class="pin-point" data-pin="bottom" fill="${C}" opacity=".8"/>`,
        },

        // ── ALT FRAGMENT ──────────────────────────────────────────
        {
            id: 'sq-fragment', label: 'Alt / Loop', group: 'Fragments',
            defaultValue: 'alt [condition]',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(3,3)">
                <rect width="58" height="45" rx="2" fill="rgba(237,137,54,.06)" stroke="${C}" stroke-width="1.2" stroke-dasharray="5,3"/>
                <polygon points="0,0 14,0 14,10 12,12 0,12" fill="rgba(237,137,54,.18)" stroke="${C}" stroke-width="1"/>
                <text x="7" y="9" font-size="5.5" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">alt</text>
                <line x1="0" y1="22" x2="58" y2="22" stroke="${C}" stroke-width=".8" stroke-dasharray="4,2"/>
            </g>`,
            svgContent: `
                <rect x="0" y="0" width="240" height="120" rx="3" fill="rgba(237,137,54,.05)" stroke="${C}" stroke-width="${SW}" stroke-dasharray="8,4" class="sq-fragment-box"/>
                <polygon points="0,0 28,0 28,20 24,24 0,24" fill="rgba(237,137,54,.18)" stroke="${C}" stroke-width="1.2"/>
                <text x="12" y="15" font-size="10" fill="${C}" font-weight="bold" font-family="Inter,sans-serif">alt</text>
                <line x1="0" y1="60" x2="240" y2="60" stroke="${C}" stroke-width="1" stroke-dasharray="6,3"/>
                <text x="8" y="40" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">alt [condition]</text>`,
        },

        // ── NOTE ──────────────────────────────────────────────────
        {
            id: 'sq-note', label: 'Note', group: 'Annotations',
            defaultValue: 'note…',
            labelOffsetY: -5,
            geoClass: 'component',
            previewViewBox: '0 0 65 52',
            svgPreview: `<g transform="translate(4,4)">
                <polygon points="0,0 50,0 50,40 0,40" fill="rgba(237,137,54,.07)" stroke="${C}" stroke-width="1"/>
                <polygon points="36,0 50,0 50,14" fill="rgba(237,137,54,.15)" stroke="${C}" stroke-width="1"/>
                <line x1="36" y1="0" x2="36" y2="14" stroke="${C}" stroke-width="1"/>
                <text x="5" y="26" font-size="6.5" fill="${C2}" font-family="Inter,sans-serif">note…</text>
            </g>`,
            svgContent: `
                <polygon points="0,0 100,0 100,60 0,60" fill="rgba(237,137,54,.06)" stroke="${C}" stroke-width="${SW}"/>
                <polygon points="76,0 100,0 100,24" fill="rgba(237,137,54,.14)" stroke="${C}" stroke-width="1"/>
                <line x1="76" y1="0" x2="76" y2="24" stroke="${C}" stroke-width="1"/>
                <text x="8" y="28" font-size="9" fill="${C2}" font-family="Inter,sans-serif" class="sym-value">note…</text>`,
        },
    ];
        SYMBOLS.push(...localSymbols);
    })();

    // --- Cloud Architecture (Basics) ---
    (function() {
        const C = '#4facfe'; // Blue
        const localSymbols = [
            // ── CLOUD ──────────────────────────────────────────────
            {
                id: 'cloud', label: 'Cloud', group: 'Architecture',
                defaultValue: null,
                geoClass: 'component',
                previewViewBox: '0 0 65 52',
                svgPreview: `<g transform="translate(5,10)">
                    <path d="M 10,30 A 10,10 0 0 1 10,10 A 15,15 0 0 1 40,10 A 10,10 0 0 1 45,30 Z" fill="rgba(79,172,254,0.1)" stroke="${C}" stroke-width="1.2"/>
                </g>`,
                svgContent: `
                    <path d="M 20,60 A 20,20 0 0 1 20,20 A 30,30 0 0 1 80,20 A 20,20 0 0 1 90,60 Z" fill="rgba(79,172,254,0.08)" stroke="${C}" stroke-width="1.8"/>
                    <circle cx="20" cy="40" r="4" class="pin-point" data-pin="left" fill="${C}"/>
                    <circle cx="100" cy="40" r="4" class="pin-point" data-pin="right" fill="${C}"/>`,
            },
            // ── DATABASE ───────────────────────────────────────────
            {
                id: 'database', label: 'Database', group: 'Architecture',
                defaultValue: 'DB',
                geoClass: 'component',
                previewViewBox: '0 0 65 52',
                svgPreview: `<g transform="translate(15,8)">
                    <ellipse cx="18" cy="8" rx="18" ry="6" fill="rgba(79,172,254,0.15)" stroke="${C}" stroke-width="1.2"/>
                    <path d="M 0,8 V 30 A 18,6 0 0 0 36,30 V 8" fill="rgba(79,172,254,0.05)" stroke="${C}" stroke-width="1.2"/>
                </g>`,
                svgContent: `
                    <ellipse cx="40" cy="15" rx="40" ry="12" fill="rgba(79,172,254,0.15)" stroke="${C}" stroke-width="1.8"/>
                    <path d="M 0,15 V 65 A 40,12 0 0 0 80,65 V 15" fill="rgba(79,172,254,0.05)" stroke="${C}" stroke-width="1.8"/>
                    <ellipse cx="40" cy="65" rx="40" ry="12" fill="none" stroke="${C}" stroke-width="1" stroke-dasharray="4,2"/>
                    <text x="40" y="45" text-anchor="middle" font-size="12" fill="${C}" font-family="Inter,sans-serif" class="sym-value">DB</text>
                    <circle cx="0"  cy="40" r="4" class="pin-point" data-pin="left" fill="${C}"/>
                    <circle cx="80" cy="40" r="4" class="pin-point" data-pin="right" fill="${C}"/>`,
            },
            // ── SERVER ─────────────────────────────────────────────
            {
                id: 'server', label: 'Server', group: 'Architecture',
                defaultValue: 'Server',
                geoClass: 'component',
                previewViewBox: '0 0 65 52',
                svgPreview: `<g transform="translate(10,10)">
                    <rect width="45" height="32" rx="2" fill="rgba(79,172,254,0.1)" stroke="${C}" stroke-width="1.2"/>
                    <line x1="5" y1="8" x2="40" y2="8" stroke="${C}" stroke-width="1" opacity=".5"/>
                    <line x1="5" y1="16" x2="40" y2="16" stroke="${C}" stroke-width="1" opacity=".5"/>
                    <circle cx="8" cy="24" r="1.5" fill="${C}"/>
                </g>`,
                svgContent: `
                    <rect x="0" y="0" width="100" height="70" rx="4" fill="rgba(79,172,254,0.08)" stroke="${C}" stroke-width="1.8"/>
                    <line x1="10" y1="15" x2="90" y2="15" stroke="${C}" stroke-width="1" opacity=".6"/>
                    <line x1="10" y1="30" x2="90" y2="30" stroke="${C}" stroke-width="1" opacity=".6"/>
                    <circle cx="15" cy="50" r="3" fill="${C}"/>
                    <circle cx="25" cy="50" r="3" fill="${C}" opacity=".4"/>
                    <text x="60" y="54" text-anchor="middle" font-size="11" fill="${C}" font-family="Inter,sans-serif" class="sym-value">Server</text>
                    <circle cx="0"  cy="35" r="4" class="pin-point" data-pin="left" fill="${C}"/>
                    <circle cx="100" cy="35" r="4" class="pin-point" data-pin="right" fill="${C}"/>`,
            },
            // ── CLIENT ─────────────────────────────────────────────
            {
                id: 'client', label: 'Client/PC', group: 'Architecture',
                defaultValue: 'Client',
                geoClass: 'component',
                previewViewBox: '0 0 65 52',
                svgPreview: `<g transform="translate(10,10)">
                    <rect width="45" height="28" rx="2" fill="none" stroke="${C}" stroke-width="1.2"/>
                    <line x1="12" y1="34" x2="33" y2="34" stroke="${C}" stroke-width="1.5"/>
                    <line x1="22.5" y1="28" x2="22.5" y2="34" stroke="${C}" stroke-width="1.2"/>
                </g>`,
                svgContent: `
                    <rect x="10" y="0" width="80" height="50" rx="3" fill="rgba(79,172,254,0.05)" stroke="${C}" stroke-width="1.8"/>
                    <line x1="30" y1="65" x2="70" y2="65" stroke="${C}" stroke-width="3"/>
                    <line x1="50" y1="50" x2="50" y2="65" stroke="${C}" stroke-width="2"/>
                    <text x="50" y="30" text-anchor="middle" font-size="11" fill="${C}" font-family="Inter,sans-serif" class="sym-value">Client</text>
                    <circle cx="50" cy="0"  r="4" class="pin-point" data-pin="top" fill="${C}"/>`,
            },
        ];
        SYMBOLS.push(...localSymbols);
    })();

    function registerSoftware() {
        if (typeof window.editor === 'undefined') return;
        window.editor.registerDomainKit('software', {
            label:   'Software',
            icon:    'material-symbols:schema-outline',
            symbols: SYMBOLS,
            exportOptions: ['svg', 'json', 'png'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(registerSoftware, 200));
    } else {
        setTimeout(registerSoftware, 200);
    }
})();
