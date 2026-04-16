/* ============================================================
   CameraMatrix — zoom + pan only (no rotation)
   Rotation is handled exclusively by #_cameraRotGroup in SVG.

   After CSS transforms are removed from #svgWrapper, SVG's own
   getScreenCTM() correctly encodes the full world→screen mapping
   (zoom + pan + rotation via _cameraRotGroup). The canvas overlay
   uses getScreenCTM() for handle positioning — not this matrix.
   ============================================================ */

class CameraMatrix {
    constructor() {
        this._zoom  = 1;
        this._tx    = 0;   // pan in container-relative CSS pixels
        this._ty    = 0;
        this._dirty = true;
        this._inv   = new DOMMatrix();
    }

    get zoom() { return this._zoom; }
    get tx()   { return this._tx; }
    get ty()   { return this._ty; }

    setZoom(z)     { this._zoom = z; this._dirty = true; }
    setPan(tx, ty) { this._tx = tx; this._ty = ty; this._dirty = true; }
    panBy(dx, dy)  { this._tx += dx; this._ty += dy; this._dirty = true; }

    // Zoom-at-cursor: keeps the world point under screen point (sx, sy) fixed.
    // sx, sy are CONTAINER-relative pixels (clientX - ctnrRect.left).
    zoomAt(newZoom, sx, sy) {
        const ratio = newZoom / this._zoom;
        this._tx = sx - ratio * (sx - this._tx);
        this._ty = sy - ratio * (sy - this._ty);
        this._zoom = newZoom;
        this._dirty = true;
    }

    _rebuild() {
        if (!this._dirty) return;
        // Forward (world→screen): scale(zoom) then translate(tx,ty)
        // No rotation — rotation is handled by _cameraRotGroup in SVG.
        const fwd = new DOMMatrix([this._zoom, 0, 0, this._zoom, this._tx, this._ty]);
        this._inv = fwd.inverse();
        this._dirty = false;
    }

    // Screen → World  (replaces getScreenCTM() path for pointer input events)
    // sx, sy are CONTAINER-relative pixels (clientX - ctnrRect.left).
    screenToWorld(sx, sy) {
        this._rebuild();
        const p = new DOMPoint(sx, sy).matrixTransform(this._inv);
        return { x: p.x, y: p.y };
    }

    // Compute SVG viewBox string from zoom + pan (no rotation component).
    // origVB = { x, y, w, h }  containerW = #svgContainer clientWidth
    toViewBox(origVB, containerW) {
        const vbW = origVB.w / this._zoom;
        const vbH = origVB.h / this._zoom;
        const spp = origVB.w / (this._zoom * containerW);  // SVG units per screen pixel
        const vbX = origVB.x - this._tx * spp;
        const vbY = origVB.y - this._ty * spp;
        return {
            x: vbX, y: vbY, w: vbW, h: vbH,
            str: `${vbX} ${vbY} ${vbW} ${vbH}`,
        };
    }

    getState()  { return { zoom: this._zoom, tx: this._tx, ty: this._ty }; }
    setState(s) {
        this._zoom = s.zoom;
        this._tx   = s.tx;
        this._ty   = s.ty;
        this._dirty = true;
    }
}
