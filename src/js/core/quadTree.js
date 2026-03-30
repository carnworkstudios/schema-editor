/* ============================================================
   Schematics Editor — 2D QuadTree
   Spatial index for edit-time proximity queries.
   Activated per-file only when element count > 500.
   ============================================================ */

class QuadTree2D {
    // bounds: { x, y, width, height }  |  capacity: max points before subdivide
    constructor(bounds, capacity = 8) {
        this.bounds   = bounds;
        this.capacity = capacity;
        this._points  = [];
        this._divided = false;
        this._nw = this._ne = this._sw = this._se = null;
    }

    // ── Insert { x, y, data } ────────────────────────────────
    insert(point) {
        if (!this._containsPt(point)) return false;
        if (!this._divided && this._points.length < this.capacity) {
            this._points.push(point);
            return true;
        }
        if (!this._divided) this._subdivide();
        return (
            this._nw.insert(point) || this._ne.insert(point) ||
            this._sw.insert(point) || this._se.insert(point)
        );
    }

    // ── Rectangle query → all points inside { x, y, w, h } ──
    query(range, out = []) {
        if (!this._intersects(range)) return out;
        if (!this._divided) {
            for (const p of this._points)
                if (this._containsInRange(range, p)) out.push(p);
            return out;
        }
        this._nw.query(range, out); this._ne.query(range, out);
        this._sw.query(range, out); this._se.query(range, out);
        return out;
    }

    // ── Circular query → all points within radius of (x, y) ──
    queryRadius(x, y, radius) {
        const range = { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
        const r2    = radius * radius;
        return this.query(range).filter(p => (p.x - x) ** 2 + (p.y - y) ** 2 <= r2);
    }

    // ── Internals ─────────────────────────────────────────────
    _subdivide() {
        const { x, y, width: w, height: h } = this.bounds;
        const hw = w / 2, hh = h / 2;
        const mk = (bx, by) => new QuadTree2D({ x: bx, y: by, width: hw, height: hh }, this.capacity);
        this._nw = mk(x,      y);      this._ne = mk(x + hw, y);
        this._sw = mk(x,      y + hh); this._se = mk(x + hw, y + hh);
        this._divided = true;
        for (const p of this._points)
            this._nw.insert(p) || this._ne.insert(p) ||
            this._sw.insert(p) || this._se.insert(p);
        this._points = [];
    }

    _containsPt(p) {
        const b = this.bounds;
        return p.x >= b.x && p.x <= b.x + b.width &&
               p.y >= b.y && p.y <= b.y + b.height;
    }

    _containsInRange(r, p) {
        return p.x >= r.x && p.x <= r.x + r.width &&
               p.y >= r.y && p.y <= r.y + r.height;
    }

    _intersects(r) {
        const b = this.bounds;
        return !(r.x > b.x + b.width  || r.x + r.width  < b.x ||
                 r.y > b.y + b.height || r.y + r.height < b.y);
    }
}
