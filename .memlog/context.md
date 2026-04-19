<!-- INJECTION POLICY
tier 1 — always inject:  context.md  task-manager.md  scratch.md
tier 2 — task start:     portfolio.md  decisions.md  errors.md
tier 3 — on demand:      memory.md  decisions-archive.md  session-log.md
size targets:
  context.md       ≤ 500 toks
  task-manager.md  ≤ 300 toks
  portfolio.md     ≤ 1000 toks
  memory.md        ≤ 3000 toks
  decisions.md     ≤ 100 lines → archive oldest 50 when exceeded
pruning rule:
  end of session → append context.md handoff block to session-log.md,
  then reset context.md to blank template
-->

## Session Handoff

last_file: tools/schema-editor/src/css/svgEditorUI.css
active_task: Locked-layer system + undo wire-array bug fix
branch_state: uncommitted changes (7 files modified, not committed)

## What happened this session (Apr 18 2026)

**Symbol palette SVG preview fix:**
- `domainManager.js` `_renderSymbolPalette`: wrapped `sym.svgPreview` in `<svg viewBox="0 0 65 52">` — browsers need a proper SVG root to render shape primitives inside a div

**Highlight classification fix (highlights.js):**
- `highlightComponents`: changed from `[data-symbol]` (whole group) → `[data-symbol] > *` filtered to exclude `.pin-point` and `.sym-value`
- `highlightConnectors`: added DOM fallback `[data-symbol] circle.pin-point` alongside `this.connectors` array
- Module = whole `[data-symbol]` group (unchanged/correct)

**Locked-layer system:**
- `svgEditor.js:461`: `_canvasBg` rect gets `data-locked="true"` at new-canvas creation
- `wiringDiagram.js` `_mountParsedSvg`: locks any imported `#_canvasBg` after mount
- `canvasEngine.js` `_bindCanvasEvents`: blocks clicking locked elements (toast)
- `canvasEngine.js` `deleteSelected`: filters out locked elements, warns if any skipped
- `layers.js` `buildLayersTree`: filters `_gridLayer` from tree (grid only via toggle button)
- `layers.js` `_buildFlatLayerTree`: lock icon per item, click toggles `data-locked`, locked items show amber border + italic dimmed name, rename blocked while locked
- `svgEditorUI.css`: `.layer-item-locked`, `.layer-lock-btn`, light-mode overrides

**Undo wire-array bug fix (history.js):**
- Root cause: wire-group wrappers have no `id` → invisible to `_captureFullState` → stale `this.wires/components/connectors` arrays after undo
- Fix: in `_applyHistoryState`, after `_restoreFullState`, clear all three arrays and call `_scheduleGeoAnalysis?.()` to rebuild from restored DOM

## Architecture Contract (stable)

| Space | Definition | Who uses it |
|---|---|---|
| **Document-local** | `_cameraRotGroup`'s local coordinate space. All element `transform=` attrs, `getBBox()` results, `_getSelectionBBoxWorld`, `screenToSVG`. | Drawing, selection, snap |
| **SVG root** | SVG viewport space. Only used internally by `getScreenCTM()` chain. | Nobody directly |
| **Screen** | CSS pixels relative to `#svgContainer` top-left. | Handle overlay canvas, drag events |
| Mapping: doc-local → screen | `_cameraRotGroup.getScreenCTM()` | `_worldToOverlayScreen`, `screenToSVG` |
| Mapping: screen → doc-local | `_cameraRotGroup.getScreenCTM().inverse()` | `screenToSVG` |

## Lock contract

| Element | Locked by default | Can unlock |
|---|---|---|
| `#_canvasBg` | Yes (`data-locked="true"`) | Yes — via lock icon in Layers panel |
| `#_gridLayer` | Hidden from Layers panel entirely | N/A — only Grid ON/OFF toggle |
| Domain symbols | No | N/A |
| Drawn shapes | No | User can lock manually via Layers |

## Active Commits (HEAD per repo)

portfolio:        eaee4da  "Updated schema-editor to use proper rendering engine for SVG"
schema-editor:    0fdcf7b  "updated the README.md" — 7 files modified, not committed

## next_action

  1. Test in browser: open Layers panel, verify _gridLayer absent, verify _canvasBg shows amber lock, click lock icon to unlock/relock
  2. Test: click canvas background → locked toast; delete locked → skipped toast
  3. Test: place symbol → undo → verify wires/components re-analyzed, no disappearing
  4. Commit all schema-editor changes
  5. Wire delete: click bezier hit-test + Delete key handler (not yet implemented)
  6. Table mode: row count gate (warn > 5k) + chunked render for initial load
  7. Connect TAFNE to canvas via PostMessage / IFC bus
  8. PDF processor frontend wiring
