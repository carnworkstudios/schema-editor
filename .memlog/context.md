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

last_file: tools/schema-editor/src/js/canvas/canvasEngine.js
active_task: Camera/coordinate system refactor — runtime bugs fixed
branch_state: schema-editor changes staged (not yet committed)

## What happened this session (Apr 16 2026)

**Camera/Coordinate Refactor — Bug Fixes (all 5 bugs resolved):**

**Bug 1 — Pan jump (Hammer.js dual-fire with native mouse drag)**
- `svgEditor.js` `setupGestures()`: added `if (ev.pointerType === 'mouse') return;` at top of `panstart` handler
- Mouse pan handled exclusively by native `mousedown/mousemove`; Hammer now handles touch/stylus only
- Fixed stale refs: `this.currentZoom` → `this.camera.zoom`, `{ ...this.currentTranslate }` → `{ x: this.camera.tx, y: this.camera.ty }` (3 locations each)

**Bug 2 — Symbols/drawn elements placed outside `_cameraRotGroup`**
- All user-content `appendChild` calls migrated to `this._contentRoot`:
  - `domainManager.js` line ~178: `_placeSymbol`
  - `drawingTools.js` lines ~145, ~156, ~351: preview + commit + text
  - `clipboard.js` line ~54: paste
  - `wiringDiagram.js` lines ~738, ~804: wire groups + component overlays

**Bug 3 — SVG import used stale camera variables**
- `wiringDiagram.js` SVG load path: removed `this.currentZoom/Translate/Pitch/Yaw = ...`
- Replaced with `this.camera.setState({ zoom: 1, tx: 0, ty: 0 })` + `this.currentRotation = 0`
- Import now clears `_contentRoot` children first, then routes correctly (defs → SVG root, content → `_contentRoot`)

**Bug 4 — Rotate/scale operated around wrong origin**
- `canvasEngine.js` `_getSelectionBBoxWorld()`: walk now stops at `_cameraRotGroup` (exclusive)
- Keeps bbox coords in document-local space where element `transform=` attributes are interpreted
- Previously walked to SVG root, including camera rotation in bbox → origin was wrong

**Bug 5 — Screen↔world mapping inconsistent at rotation ≠ 0**
- `canvasEngine.js` `_worldToOverlayScreen()`: now uses `_cameraRotGroup.getScreenCTM()` (not `svg.getScreenCTM()`)
- `snapGrid.js` `screenToSVG()`: same fix — uses `_cameraRotGroup.getScreenCTM().inverse()`
- SVG root space ≠ document-local space when camera is rotated; both methods now use the correct space

## Architecture Contract (stable)

| Space | Definition | Who uses it |
|---|---|---|
| **Document-local** | `_cameraRotGroup`'s local coordinate space. All element `transform=` attrs, `getBBox()` results, `_getSelectionBBoxWorld`, `screenToSVG`. | Drawing, selection, snap |
| **SVG root** | SVG viewport space. Only used internally by `getScreenCTM()` chain. | Nobody directly |
| **Screen** | CSS pixels relative to `#svgContainer` top-left. | Handle overlay canvas, drag events |
| Mapping: doc-local → screen | `_cameraRotGroup.getScreenCTM()` | `_worldToOverlayScreen`, `screenToSVG` |
| Mapping: screen → doc-local | `_cameraRotGroup.getScreenCTM().inverse()` | `screenToSVG` |

## Active Commits (HEAD per repo)

portfolio:        0d59b9c  "updated codebase — table-formatter with vedant and my update"
table-formatter:  dc6b952  "Add arrow key navigation (#5)" — staged changes pending commit
schema-editor:    0fdcf7b  "updated the README.md" — camera refactor changes staged, not committed
pdf-processor:    7c37663  (latest; in-progress)

## next_action

  1. Test in browser: pan (smooth?), draw element, select, rotate, scale, undo
  2. Test symbol drag-and-drop from palette onto canvas
  3. Test SVG file import — content visible, fit-to-view works, camera reset
  4. Commit all schema-editor changes
  5. Wire delete: click bezier hit-test + Delete key handler (not yet implemented)
  6. Table mode: row count gate (warn > 5k) + chunked render for initial load
  7. Connect TAFNE to canvas via PostMessage / IFC bus
  8. PDF processor frontend wiring
