/* ============================================================
   Schematics Editor — 2D KD-Tree
   Spatial index for wire endpoint snapping and port discovery.
   Used by geometryEngine.js (Phase 3 topology).
   ============================================================ */

class KDTree2D {
    constructor() {
        this._root = null;
        this._size = 0;
    }

    get size() { return this._size; }

    // ── Build a balanced tree from an array of { x, y, data } ─
    static fromPoints(points) {
        const tree = new KDTree2D();
        tree._root = KDTree2D._buildBalanced([...points], 0);
        tree._size = points.length;
        return tree;
    }

    static _buildBalanced(pts, depth) {
        if (!pts.length) return null;
        const axis = depth % 2;
        const dim  = axis === 0 ? 'x' : 'y';
        pts.sort((a, b) => a[dim] - b[dim]);
        const mid = pts.length >> 1;
        return {
            point: pts[mid],
            left:  KDTree2D._buildBalanced(pts.slice(0, mid),       depth + 1),
            right: KDTree2D._buildBalanced(pts.slice(mid + 1),      depth + 1),
        };
    }

    // ── Insert a single { x, y, data } point ─────────────────
    insert(point) {
        this._root = this._insert(this._root, point, 0);
        this._size++;
    }

    _insert(node, point, depth) {
        if (!node) return { point, left: null, right: null };
        const dim = depth % 2 === 0 ? 'x' : 'y';
        if (point[dim] < node.point[dim])
            node.left  = this._insert(node.left,  point, depth + 1);
        else
            node.right = this._insert(node.right, point, depth + 1);
        return node;
    }

    // ── Find all points within `radius` of (x, y) ────────────
    rangeQuery(x, y, radius) {
        const results = [];
        this._range(this._root, x, y, radius * radius, radius, 0, results);
        return results;
    }

    _range(node, x, y, r2, radius, depth, out) {
        if (!node) return;
        const { point } = node;
        const dx = point.x - x, dy = point.y - y;
        if (dx * dx + dy * dy <= r2) out.push(point);

        const axis  = depth % 2;
        const delta = axis === 0 ? x - point.x : y - point.y;
        const near  = delta < 0 ? node.left  : node.right;
        const far   = delta < 0 ? node.right : node.left;

        this._range(near, x, y, r2, radius, depth + 1, out);
        if (delta * delta <= r2)
            this._range(far,  x, y, r2, radius, depth + 1, out);
    }

    // ── Find the single nearest point to (x, y) ──────────────
    nearest(x, y) {
        if (!this._root) return null;
        const best = { point: null, dist2: Infinity };
        this._nearest(this._root, x, y, 0, best);
        return best.point;
    }

    _nearest(node, x, y, depth, best) {
        if (!node) return;
        const { point } = node;
        const dx = point.x - x, dy = point.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best.dist2) { best.dist2 = d2; best.point = point; }

        const axis  = depth % 2;
        const delta = axis === 0 ? x - point.x : y - point.y;
        const near  = delta < 0 ? node.left  : node.right;
        const far   = delta < 0 ? node.right : node.left;

        this._nearest(near, x, y, depth + 1, best);
        if (delta * delta < best.dist2)
            this._nearest(far,  x, y, depth + 1, best);
    }

    clear() { this._root = null; this._size = 0; }
}
