/* ============================================================
   CameraMatrix — zoom + pan only (no rotation)
   Rotation is handled exclusively by #_cameraRotGroup in SVG.

   After CSS transforms are removed from #svgWrapper, SVG's own
   getScreenCTM() correctly encodes the full world→screen mapping
   (zoom + pan + rotation via _cameraRotGroup). The canvas overlay
   uses getScreenCTM() for handle positioning — not this matrix.
   ============================================================ */

const ZOOM_MIN = 0.02;
const ZOOM_MAX = 500;

class CameraMatrix {
    constructor() {
        this._zoom     = 1;
        this._tx       = 0;   // pan in container-relative CSS pixels
        this._ty       = 0;
        this._rotation = 0;   // degrees — authoritative source; viewTransform reads this
        this._dirty    = true;
        this._inv      = new DOMMatrix();
    }

    get zoom()     { return this._zoom; }
    get tx()       { return this._tx; }
    get ty()       { return this._ty; }
    get rotation() { return this._rotation; }

    setZoom(z)         { this._zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +z || 1)); this._dirty = true; }
    setPan(tx, ty)     { this._tx = tx; this._ty = ty; this._dirty = true; }
    panBy(dx, dy)      { this._tx += dx; this._ty += dy; this._dirty = true; }
    setRotation(deg)   { this._rotation = ((+deg || 0) % 360 + 360) % 360; this._dirty = true; }

    // Zoom-at-cursor: keeps the world point under screen point (sx, sy) fixed.
    // sx, sy are CONTAINER-relative pixels (clientX - ctnrRect.left).
    zoomAt(newZoom, sx, sy) {
        const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +newZoom || 1));
        const ratio = z / this._zoom;
        this._tx = sx - ratio * (sx - this._tx);
        this._ty = sy - ratio * (sy - this._ty);
        this._zoom = z;
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

    // Compute SVG viewBox string from absolute zoom + pan.
    // cW, cH are the container dimensions in screen pixels.
    toViewBox(cW, cH) {
        const vbW = cW / this._zoom;
        const vbH = cH / this._zoom;
        const vbX = -this._tx / this._zoom;
        const vbY = -this._ty / this._zoom;
        return {
            x: vbX, y: vbY, w: vbW, h: vbH,
            str: `${vbX} ${vbY} ${vbW} ${vbH}`,
        };
    }

    getState()  { return { zoom: this._zoom, tx: this._tx, ty: this._ty, rotation: this._rotation }; }
    setState(s) {
        if (s.zoom     !== undefined) this._zoom     = s.zoom;
        if (s.tx       !== undefined) this._tx       = s.tx;
        if (s.ty       !== undefined) this._ty       = s.ty;
        if (s.rotation !== undefined) this._rotation = s.rotation;
        this._dirty = true;
    }
}
