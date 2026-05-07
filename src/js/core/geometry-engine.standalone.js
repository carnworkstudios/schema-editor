/* ============================================================
   PDFGeometryEngine — worker-safe standalone topology engine
   @public-api  Part of ginexys-schema-engine open layer.

   Runs in Web Workers, Node.js, or any browser context.
   No DOM, no jQuery, no document, no window required.
   DOMMatrix + DOMPoint used for transform math — both are
   available natively in Workers in all modern browsers.

   Requires KDTree2D in scope before this file:
     importScripts('kdTree.js', 'geometry-engine.standalone.js')

   Descriptor contract — produced by PDFGeometryEngine.serialize()
   or any main-thread code that walks an SVG DOM:
   {
     id:       string,
     tagName:  'path'|'line'|'rect'|'circle'|'ellipse'|'polyline'|'polygon'|'g',
     cmds?:    {cmd, args}[],        // pre-parsed path commands (paths only)
     pts?:     number[],             // flat [x,y,...] override if pre-computed
     bbox?:    {x,y,width,height},   // required for <g data-geo-class> elements
     attrs:    {
       stroke, fill, 'stroke-width', class,
       'data-geo-class', 'data-symbol',
       d, points, cx, cy, r, rx, ry,
       x, y, width, height, x1, y1, x2, y2
     },
     transform?: string,             // DOMMatrix-compatible string, applied in Phase 1
   }

   Returns:
   {
     wires:      { id, descId, color, width, endpoints, length, linearity, bbox }[],
     components: { id, descId, bbox, circularity, type, ports }[],
     connectors: { id, descId, bbox, type:'connector' }[],
     graph:      { nodes: Map, edges: Map, adjacency: Map },
     ports:      { compId, wireId, x, y }[],
   }
   ============================================================ */

/* ── PathData — inline for worker context ───────────────────
   Converts SVG path `d` strings into structured command arrays.
   All output commands are absolute; H/V are expanded to L.    */
const _PathData = {
    parse(d) {
        const TOKEN = /([MmZzLlHhVvCcSsQqTtAa])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
        const tokens = [];
        let m;
        while ((m = TOKEN.exec(d)) !== null)
            tokens.push(m[1] !== undefined ? m[1] : parseFloat(m[2]));

        const cmds = [];
        let i = 0, cx = 0, cy = 0, sx = 0, sy = 0;

        const nums = () => {
            const a = [];
            while (i < tokens.length && typeof tokens[i] === 'number') a.push(tokens[i++]);
            return a;
        };

        while (i < tokens.length) {
            const cmd = tokens[i++];
            if (typeof cmd !== 'string') continue;
            const rel = cmd === cmd.toLowerCase() && cmd !== 'Z' && cmd !== 'z';
            const k   = cmd.toUpperCase();
            switch (k) {
                case 'M': {
                    let first = true;
                    const a = nums();
                    for (let j = 0; j < a.length; j += 2) {
                        cx = rel && !first ? cx + a[j] : (rel ? cx + a[j] : a[j]);
                        cy = rel && !first ? cy + a[j+1] : (rel ? cy + a[j+1] : a[j+1]);
                        cmds.push({ cmd: first ? 'M' : 'L', args: [cx, cy] });
                        if (first) { sx = cx; sy = cy; first = false; }
                    }
                    break;
                }
                case 'L': {
                    const a = nums();
                    for (let j = 0; j < a.length; j += 2) {
                        cx = rel ? cx + a[j] : a[j]; cy = rel ? cy + a[j+1] : a[j+1];
                        cmds.push({ cmd: 'L', args: [cx, cy] });
                    }
                    break;
                }
                case 'H': { const a = nums(); for (const v of a) { cx = rel ? cx + v : v; cmds.push({ cmd: 'L', args: [cx, cy] }); } break; }
                case 'V': { const a = nums(); for (const v of a) { cy = rel ? cy + v : v; cmds.push({ cmd: 'L', args: [cx, cy] }); } break; }
                case 'C': {
                    const a = nums();
                    for (let j = 0; j < a.length; j += 6) {
                        const ax = rel?cx+a[j]:a[j], ay = rel?cy+a[j+1]:a[j+1];
                        const bx = rel?cx+a[j+2]:a[j+2], by = rel?cy+a[j+3]:a[j+3];
                        cx = rel?cx+a[j+4]:a[j+4]; cy = rel?cy+a[j+5]:a[j+5];
                        cmds.push({ cmd: 'C', args: [ax, ay, bx, by, cx, cy] });
                    }
                    break;
                }
                case 'Q': {
                    const a = nums();
                    for (let j = 0; j < a.length; j += 4) {
                        const ax = rel?cx+a[j]:a[j], ay = rel?cy+a[j+1]:a[j+1];
                        cx = rel?cx+a[j+2]:a[j+2]; cy = rel?cy+a[j+3]:a[j+3];
                        cmds.push({ cmd: 'Q', args: [ax, ay, cx, cy] });
                    }
                    break;
                }
                case 'Z': case 'z': cx = sx; cy = sy; cmds.push({ cmd: 'Z', args: [] }); break;
                default: nums(); break;
            }
        }
        return cmds;
    },

    splitSubpaths(cmds) {
        const subs = []; let cur = [];
        for (const c of cmds) {
            if (c.cmd === 'M' && cur.length) { subs.push(cur); cur = []; }
            cur.push(c);
        }
        if (cur.length) subs.push(cur);
        return subs;
    },

    serialize(cmds) {
        return cmds.map(c => c.cmd === 'Z' ? 'Z' : `${c.cmd} ${c.args.join(' ')}`).join(' ');
    },

    transformCmds(cmds, matrix) {
        const T = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return [p.x, p.y]; };
        return cmds.map(c => {
            if (c.cmd === 'Z') return c;
            if (c.cmd === 'M' || c.cmd === 'L') { const [nx, ny] = T(c.args[0], c.args[1]); return { cmd: c.cmd, args: [nx, ny] }; }
            if (c.cmd === 'C') { const [ax,ay]=T(c.args[0],c.args[1]), [bx,by]=T(c.args[2],c.args[3]), [ex,ey]=T(c.args[4],c.args[5]); return { cmd:'C', args:[ax,ay,bx,by,ex,ey] }; }
            if (c.cmd === 'Q') { const [ax,ay]=T(c.args[0],c.args[1]), [ex,ey]=T(c.args[2],c.args[3]); return { cmd:'Q', args:[ax,ay,ex,ey] }; }
            return c;
        });
    },

    _flatCubic(x0,y0,x1,y1,x2,y2,x3,y3,eps,pts) {
        const mx=(x0+x3)/2, my=(y0+y3)/2;
        const cx=(x1+x2)/2, cy=(y1+y2)/2;
        if (Math.hypot(cx-mx,cy-my)<eps) { pts.push(x3,y3); return; }
        const ax=(x0+x1)/2,ay=(y0+y1)/2, bx=(x2+x3)/2,by=(y2+y3)/2;
        const dx=(ax+cx)/2,dy=(ay+cy)/2, ex=(cx+bx)/2,ey=(cy+by)/2;
        const fx=(dx+ex)/2,fy=(dy+ey)/2;
        this._flatCubic(x0,y0,ax,ay,dx,dy,fx,fy,eps,pts);
        this._flatCubic(fx,fy,ex,ey,bx,by,x3,y3,eps,pts);
    },

    _flatQuad(x0,y0,x1,y1,x2,y2,eps,pts) {
        const mx=(x0+x2)/2,my=(y0+y2)/2;
        if (Math.hypot(x1-mx,y1-my)<eps) { pts.push(x2,y2); return; }
        const ax=(x0+x1)/2,ay=(y0+y1)/2, bx=(x1+x2)/2,by=(y1+y2)/2;
        const cx=(ax+bx)/2,cy=(ay+by)/2;
        this._flatQuad(x0,y0,ax,ay,cx,cy,eps,pts);
        this._flatQuad(cx,cy,bx,by,x2,y2,eps,pts);
    },

    toPoints(cmds, eps=0.5) {
        const pts = []; let cx=0,cy=0,sx=0,sy=0;
        for (const c of cmds) {
            if (c.cmd==='M') { cx=c.args[0]; cy=c.args[1]; sx=cx; sy=cy; pts.push(cx,cy); }
            else if (c.cmd==='L') { cx=c.args[0]; cy=c.args[1]; pts.push(cx,cy); }
            else if (c.cmd==='C') { this._flatCubic(cx,cy,c.args[0],c.args[1],c.args[2],c.args[3],c.args[4],c.args[5],eps,pts); cx=c.args[4]; cy=c.args[5]; }
            else if (c.cmd==='Q') { this._flatQuad(cx,cy,c.args[0],c.args[1],c.args[2],c.args[3],eps,pts); cx=c.args[2]; cy=c.args[3]; }
            else if (c.cmd==='Z') { cx=sx; cy=sy; if (pts.length>=2) pts.push(sx,sy); }
        }
        const flat = [];
        for (let i=0;i<pts.length-1;i+=2) flat.push(pts[i],pts[i+1]);
        return flat;
    },
};

/* ── PDFGeometryEngine ───────────────────────────────────── */

class PDFGeometryEngine {

    constructor({ eps = 0.5 } = {}) {
        this.eps = eps;
    }

    // ── Main entry point ──────────────────────────────────────
    analyze(descriptors) {
        const baked                          = this._bakeTransforms(descriptors);
        const merged                         = this._mergeCollinearSegments(baked);
        const { wireEls, compEls }           = this._classifyElements(merged);
        const { wires, components,
                connectors, ports }          = this._buildTopology(wireEls, compEls, this.eps);
        const graph                          = this._buildAdjacencyGraph(wires, components, ports);
        const tableRules                     = this.getTableRuleCandidates(wires);
        return { wires, components, connectors, graph, ports, tableRules };
    }

    // ── Phase 1: bake element transforms into coordinate data ─
    _bakeTransforms(descriptors) {
        return descriptors.map(desc => {
            if (!desc.transform) return desc;
            let matrix;
            try { matrix = new DOMMatrix(desc.transform); }
            catch (_) { return desc; }

            // <g> elements: apply transform to pre-computed bbox corners
            if (desc.tagName === 'g' && desc.bbox) {
                const { x, y, width: w, height: h } = desc.bbox;
                const corners = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py]) => {
                    const p = new DOMPoint(px, py).matrixTransform(matrix);
                    return [p.x, p.y];
                });
                const xs = corners.map(c=>c[0]), ys = corners.map(c=>c[1]);
                return { ...desc,
                    bbox: { x: Math.min(...xs), y: Math.min(...ys),
                            width: Math.max(...xs)-Math.min(...xs),
                            height: Math.max(...ys)-Math.min(...ys) },
                    transform: null };
            }

            // Leaf elements: apply transform to flattened point array
            const rawPts = this._getPointsFromDesc(desc);
            if (!rawPts.length) return desc;
            const baked = [];
            for (let i = 0; i < rawPts.length; i += 2) {
                const p = new DOMPoint(rawPts[i], rawPts[i+1]).matrixTransform(matrix);
                baked.push(+p.x.toFixed(3), +p.y.toFixed(3));
            }
            return { ...desc, pts: baked, transform: null };
        });
    }

    // ── Phase 1b: collinear segment merger ────────────────────
    // PDF operator streams shatter lines into tiny segments. This pre-pass
    // groups linearity≥0.88 segments that share an axis band and have an
    // endpoint gap below joinTolerance, merging them into one composite path.
    // Must run after _bakeTransforms so all coordinates are in the same space.
    _mergeCollinearSegments(descriptors, {
        joinTolerance = 3,   // max gap (pts) between consecutive segments to merge
        bandTolerance = 2,   // axis-band width — horizontal groups by Y, vertical by X
        angleTol      = 1,   // max angle difference (degrees) to consider collinear
    } = {}) {
        const LINE_TAGS = new Set(['path', 'line', 'polyline']);
        const rest = [], candidates = [];

        for (const desc of descriptors) {
            const tag = desc.tagName?.toLowerCase();
            if (!LINE_TAGS.has(tag)) { rest.push(desc); continue; }
            const score = this._scoreElement(desc);
            if (!score || score.linearity < 0.88) { rest.push(desc); continue; }
            candidates.push({ desc, score });
        }

        if (candidates.length === 0) return descriptors;

        // Compute angle + axis band for each candidate, normalise endpoint order
        const meta = candidates.map(({ desc, score }) => {
            const pts = score.pts;
            let x1 = pts[0], y1 = pts[1];
            let x2 = pts[pts.length - 2], y2 = pts[pts.length - 1];

            // Angle in [0, π) so both traversal directions map to same bucket
            let angle = Math.atan2(y2 - y1, x2 - x1);
            if (angle < 0) angle += Math.PI;
            const angleDeg = Math.round(angle * 180 / Math.PI) % 180;

            const isH = angleDeg <= angleTol || angleDeg >= 180 - angleTol;
            const isV = Math.abs(angleDeg - 90) <= angleTol;

            // Normalise so we always go left-to-right (H) or top-to-bottom (V)
            if (isH && x1 > x2) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
            if (isV && y1 > y2) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }

            const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
            const band = isH ? Math.round(midY / bandTolerance)
                       : isV ? Math.round(midX / bandTolerance)
                       :       Math.round(midY / bandTolerance);

            return { desc, score, angleDeg, band, isH, isV, x1, y1, x2, y2 };
        });

        // Group by (angleDeg, band)
        const groups = new Map();
        for (const m of meta) {
            const key = `${m.angleDeg},${m.band}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(m);
        }

        const output = [...rest];
        for (const [, group] of groups) {
            if (group.length === 1) { output.push(group[0].desc); continue; }

            // Sort along primary axis
            const isH = group[0].isH;
            group.sort((a, b) => isH ? a.x1 - b.x1 : a.y1 - b.y1);

            let chain = [group[0]];
            const flushChain = () => { output.push(this._buildMergedDesc(chain)); chain = []; };

            for (let i = 1; i < group.length; i++) {
                const prev = chain[chain.length - 1];
                const curr = group[i];
                // Use signed axis-gap; negative = overlap (still merge)
                const axisGap = isH ? curr.x1 - prev.x2 : curr.y1 - prev.y2;
                if (axisGap <= joinTolerance) {
                    chain.push(curr);
                } else {
                    flushChain();
                    chain = [curr];
                }
            }
            flushChain();
        }

        return output;
    }

    _buildMergedDesc(chain) {
        if (chain.length === 1) return chain[0].desc;
        const ref  = chain[0];
        const isH  = ref.isH;

        let x1, y1, x2, y2;
        if (isH) {
            // Horizontal: span full x range, average y to smooth any micro-drift
            const allX = chain.flatMap(m => [m.x1, m.x2]);
            const allY = chain.flatMap(m => [m.y1, m.y2]);
            x1 = Math.min(...allX); x2 = Math.max(...allX);
            y1 = y2 = allY.reduce((a, b) => a + b, 0) / allY.length;
        } else {
            // Vertical or diagonal: first start → last end (already sorted)
            const last = chain[chain.length - 1];
            x1 = ref.x1; y1 = ref.y1; x2 = last.x2; y2 = last.y2;
        }

        return {
            id:       `_merged_${ref.desc.id}`,
            tagName:  'path',
            pts:      [x1, y1, x2, y2],
            attrs:    { ...ref.desc.attrs },
            transform: null,
        };
    }

    // ── Phase 2: geometric classification ─────────────────────
    _classifyElements(descriptors) {
        const wireEls = [], compEls = [];
        const SKIP = new Set(['defs','script','style','title','desc','lineargradient',
                              'radialgradient','pattern','filter','marker','symbol','use']);
        const SKIP_CLS = ['wire-group','component-group','selection-handle-group',
                          'snap-guide','draw-preview','wire-hitbox','component-hitbox'];

        const taggedIds = new Set();

        // Pre-pass: explicitly tagged elements (data-geo-class)
        for (const desc of descriptors) {
            const geoClass = desc.attrs?.['data-geo-class'];
            if (!geoClass) continue;
            taggedIds.add(desc.id);
            if (geoClass === 'wire') {
                const score = this._scoreElement(desc);
                if (score) wireEls.push({ desc, score });
            } else {
                const score = desc.bbox
                    ? _scoreFromBBox(desc.bbox, geoClass)
                    : this._scoreElement(desc);
                if (score) compEls.push({ desc, score });
            }
        }

        // Pin-points from domain symbols: classified as connectors
        for (const desc of descriptors) {
            if (!(desc.attrs?.class || '').includes('pin-point')) continue;
            if (taggedIds.has(desc.id)) continue;
            taggedIds.add(desc.id);
            const cx = +desc.attrs.cx || 0, cy = +desc.attrs.cy || 0, r = +desc.attrs.r || 2;
            compEls.push({ desc, score: {
                bbox: { x: cx-r, y: cy-r, width: r*2, height: r*2 },
                aspect:1, linearity:0, circularity:1, pathLen:0, span:0, pts:[cx,cy],
            }});
        }

        // Heuristic pass: classify by geometry
        for (const desc of descriptors) {
            if (taggedIds.has(desc.id)) continue;
            const tag = desc.tagName?.toLowerCase();
            if (!tag || SKIP.has(tag) || tag === 'g') continue;
            const cls = desc.attrs?.class || '';
            if (SKIP_CLS.some(c => cls.includes(c))) continue;

            const score = this._scoreElement(desc);
            if (!score) continue;

            if      (score.linearity >= 0.88)                                  wireEls.push({ desc, score });
            else if (score.circularity >= 0.55 || score.linearity < 0.55)      compEls.push({ desc, score });
            else if (score.aspect >= 4)                                         wireEls.push({ desc, score });
            else                                                                compEls.push({ desc, score });
        }

        return { wireEls, compEls };
    }

    _scoreElement(desc) {
        const pts = this._getPointsFromDesc(desc);
        if (pts.length < 4) return null;

        let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        for (let i = 0; i < pts.length; i += 2) {
            if (pts[i]   < minX) minX = pts[i];   if (pts[i]   > maxX) maxX = pts[i];
            if (pts[i+1] < minY) minY = pts[i+1]; if (pts[i+1] > maxY) maxY = pts[i+1];
        }
        const bw = maxX-minX, bh = maxY-minY;
        if (bw < 1 && bh < 1) return null;

        const bbox   = { x: minX, y: minY, width: bw, height: bh };
        const aspect = (bw > 0 && bh > 0) ? Math.max(bw,bh)/Math.min(bw,bh) : Infinity;

        let pathLen = 0;
        for (let i = 2; i < pts.length; i += 2)
            pathLen += Math.hypot(pts[i]-pts[i-2], pts[i+1]-pts[i-1]);
        const span     = Math.hypot(pts[pts.length-2]-pts[0], pts[pts.length-1]-pts[1]);
        const linearity = pathLen > 0 ? span/pathLen : 0;

        let circularity = 0;
        const closed = pts[0]===pts[pts.length-2] && pts[1]===pts[pts.length-1];
        if (closed && pts.length >= 6) {
            let area = 0;
            for (let i = 0; i < pts.length-2; i += 2)
                area += pts[i]*pts[i+3] - pts[i+2]*pts[i+1];
            area = Math.abs(area)/2;
            if (pathLen > 0) circularity = (4*Math.PI*area)/(pathLen*pathLen);
        }

        return { bbox, aspect, linearity, circularity, pathLen, span, pts };
    }

    _getPointsFromDesc(desc) {
        if (Array.isArray(desc.pts) && desc.pts.length >= 2) return desc.pts;

        const a   = desc.attrs || {};
        const tag = desc.tagName?.toLowerCase();
        const EPS = 0.5;

        try {
            if (tag === 'path') {
                const cmds = desc.cmds || (a.d ? _PathData.parse(a.d) : null);
                return cmds ? _PathData.toPoints(cmds, EPS) : [];
            }
            if (tag === 'line')
                return [+a.x1||0, +a.y1||0, +a.x2||0, +a.y2||0];
            if (tag === 'polyline' || tag === 'polygon') {
                const raw = (a.points||'').trim().split(/[\s,]+/).map(Number);
                return (tag==='polygon' && raw.length>=2) ? [...raw, raw[0], raw[1]] : raw;
            }
            if (tag === 'rect') {
                const x=+a.x||0, y=+a.y||0, w=+a.width||0, h=+a.height||0;
                return [x,y, x+w,y, x+w,y+h, x,y+h, x,y];
            }
            if (tag === 'circle') {
                const cx=+a.cx||0, cy=+a.cy||0, r=+a.r||0;
                const pts=[];
                for (let i=0;i<12;i++){const θ=i*Math.PI/6; pts.push(cx+r*Math.cos(θ),cy+r*Math.sin(θ));}
                return [...pts, pts[0], pts[1]];
            }
            if (tag === 'ellipse') {
                const cx=+a.cx||0, cy=+a.cy||0, rx=+a.rx||0, ry=+a.ry||0;
                const pts=[];
                for (let i=0;i<12;i++){const θ=i*Math.PI/6; pts.push(cx+rx*Math.cos(θ),cy+ry*Math.sin(θ));}
                return [...pts, pts[0], pts[1]];
            }
        } catch (_) {}
        return [];
    }

    // ── Phase 3: topology — vertex snapping + port discovery ──
    _buildTopology(wireEls, compEls, eps) {
        const rawEps = [];
        wireEls.forEach(({ score }, i) => {
            const pts = score.pts;
            if (pts.length < 4) return;
            rawEps.push({ x: pts[0],              y: pts[1],              wireIdx: i, role: 'start' });
            rawEps.push({ x: pts[pts.length-2],   y: pts[pts.length-1],   wireIdx: i, role: 'end'   });
        });

        const kdt      = rawEps.length ? KDTree2D.fromPoints(rawEps) : new KDTree2D();
        const canon    = new Float32Array(rawEps.length * 2);
        const assigned = new Uint8Array(rawEps.length);

        rawEps.forEach((ep, i) => {
            if (assigned[i]) return;
            const neighbors = kdt.rangeQuery(ep.x, ep.y, eps);
            let cx = 0, cy = 0;
            neighbors.forEach(n => { cx += n.x; cy += n.y; });
            cx /= neighbors.length; cy /= neighbors.length;
            neighbors.forEach(n => {
                const ni = rawEps.indexOf(n);
                if (ni >= 0 && !assigned[ni]) { canon[ni*2]=cx; canon[ni*2+1]=cy; assigned[ni]=1; }
            });
        });

        const wires = wireEls.map(({ desc, score }, i) => {
            const pts = score.pts, si = i*2, ei = i*2+1;
            return {
                id:        `wire_${i}`,
                descId:    desc.id,
                color:     desc.attrs?.stroke || 'black',
                width:     parseFloat(desc.attrs?.['stroke-width'] || '1'),
                endpoints: [
                    { x: assigned[si] ? canon[si*2]   : pts[0],            y: assigned[si] ? canon[si*2+1] : pts[1]             },
                    { x: assigned[ei] ? canon[ei*2]   : pts[pts.length-2], y: assigned[ei] ? canon[ei*2+1] : pts[pts.length-1]  },
                ],
                length:    score.pathLen,
                linearity: score.linearity,
                bbox:      score.bbox,
            };
        });

        const connectors = [], components = [];
        compEls.forEach(({ desc, score }, i) => {
            const type = this._classifyComponentType(desc, score.circularity);
            if (type === 'connector') {
                connectors.push({ id: `connector_${i}`, descId: desc.id, bbox: score.bbox, type });
            } else {
                components.push({ id: `component_${i}`, descId: desc.id, bbox: score.bbox,
                                  circularity: score.circularity, type, ports: [] });
            }
        });

        const MARGIN = eps * 3, ports = [];
        wires.forEach(wire => {
            wire.endpoints.forEach(ep => {
                components.forEach(comp => {
                    const b = comp.bbox;
                    if (ep.x >= b.x-MARGIN && ep.x <= b.x+b.width+MARGIN &&
                        ep.y >= b.y-MARGIN && ep.y <= b.y+b.height+MARGIN) {
                        const port = { compId: comp.id, wireId: wire.id, x: ep.x, y: ep.y };
                        comp.ports.push(port);
                        ports.push(port);
                    }
                });
            });
        });

        return { wires, components, connectors, ports };
    }

    // ── Phase 4: adjacency graph ───────────────────────────────
    _buildAdjacencyGraph(wires, components, ports) {
        const nodes = new Map(), edges = new Map(), adjacency = new Map();

        components.forEach(c => { nodes.set(c.id, { kind:'component', ...c }); adjacency.set(c.id, []); });

        const epMap = new Map();
        wires.forEach(wire => wire.endpoints.forEach(ep => {
            const key = `${ep.x.toFixed(2)},${ep.y.toFixed(2)}`;
            if (!epMap.has(key)) epMap.set(key, []);
            epMap.get(key).push(wire.id);
        }));

        let jIdx = 0;
        epMap.forEach((ids, key) => {
            if (ids.length < 3) return;
            const [x, y] = key.split(',').map(Number);
            const jid = `junction_${jIdx++}`;
            nodes.set(jid, { kind:'junction', id:jid, x, y, degree:ids.length });
            adjacency.set(jid, []);
        });

        wires.forEach(wire => {
            const pm = ports.filter(p => p.wireId === wire.id);
            const fromNode = pm.find(p => Math.hypot(p.x-wire.endpoints[0].x, p.y-wire.endpoints[0].y) < 1)?.compId || null;
            const toNode   = pm.find(p => Math.hypot(p.x-wire.endpoints[1].x, p.y-wire.endpoints[1].y) < 1)?.compId || null;
            edges.set(wire.id, { id:wire.id, from:fromNode, to:toNode, color:wire.color, length:wire.length, signalType:null });
            if (fromNode && toNode && fromNode !== toNode) {
                adjacency.get(fromNode)?.push(toNode);
                adjacency.get(toNode)?.push(fromNode);
            }
        });

        return { nodes, edges, adjacency };
    }

    // ── Table rule filter (Phase 2 PDF pipeline) ──────────────
    // Post-analysis filter — call with the wires[] from analyze().
    // Returns the subset that are structural table rule candidates:
    //   linearity ≥ 0.88   (straight line, not a curved component)
    //   strokeWidth ≤ 2    (ruling line, not a thick border or trace)
    //   length > 20        (long enough to be a table rule, not a tick mark)
    // Pass-through to LatticeReconstructor in Phase 3.
    getTableRuleCandidates(wires) {
        return wires.filter(w =>
            w.linearity >= 0.88 &&
            w.width     <= 2    &&
            w.length    > 20
        );
    }

    // ── Component type ─────────────────────────────────────────
    _classifyComponentType(desc, circularity) {
        const a = desc.attrs || {};
        if (a['data-geo-class'] && a['data-geo-class'] !== 'wire') return a['data-geo-class'];
        if (a['data-symbol']) return a['data-symbol'];
        const cls = a.class || '', tag = desc.tagName?.toLowerCase();
        if (cls.includes('pin-point'))  return 'connector';
        if (cls.includes('resistor'))   return 'resistor';
        if (cls.includes('capacitor'))  return 'capacitor';
        if (cls.includes('switch'))     return 'switch';
        if (tag === 'circle' && circularity >= 0.7) return 'connector';
        if (tag === 'rect')                          return 'module';
        if (circularity >= 0.45 && tag !== 'g')      return 'connector';
        return 'component';
    }

    // ── Main-thread serializer (NOT worker-safe — uses DOM) ───
    // Call this on the main thread, then post the result to a worker.
    static serialize(svgEl) {
        const SKIP_TAGS = new Set(['defs','script','style','title','desc','lineargradient',
                                   'radialgradient','pattern','filter','marker','symbol','use']);
        const SKIP_CLS  = ['wire-group','component-group','selection-handle-group',
                           'snap-guide','draw-preview','wire-hitbox','component-hitbox','selection-handle'];
        const SKIP_IDS  = new Set(['_cameraRotGroup','_gridLayer','_gridDefs','_canvasBg']);
        const SKIP_ATTR = '[data-se-system="true"], #_gridLayer, .draw-preview, .selection-handle-group';

        const result = [];
        const iter   = document.createNodeIterator(svgEl, NodeFilter.SHOW_ELEMENT);
        let node;

        while ((node = iter.nextNode())) {
            if (node === svgEl) continue;
            const tag = node.tagName?.toLowerCase();
            if (!tag || SKIP_TAGS.has(tag)) continue;
            if (SKIP_IDS.has(node.id) || node.id?.startsWith('_')) continue;
            if (node.closest?.(SKIP_ATTR)) continue;
            const cls = node.className?.baseVal || '';
            if (SKIP_CLS.some(c => cls.includes(c))) continue;
            if (node.closest?.('.wire-group, .component-group')) continue;

            const geoClass = node.getAttribute('data-geo-class');
            let bbox = null;

            if (tag === 'g') {
                if (!geoClass) continue;  // skip non-tagged containers
                try { const b = node.getBBox(); if (b.width||b.height) bbox={x:b.x,y:b.y,width:b.width,height:b.height}; }
                catch(_) {}
                if (!bbox) continue;
            }

            const ga = n => node.getAttribute(n);
            let cmds = null;
            if (tag === 'path') {
                try { cmds = _PathData.parse(ga('d') || ''); } catch(_) {}
            }

            result.push({
                id:      node.id || `_n${result.length}`,
                tagName: tag,
                cmds,
                bbox,
                attrs: {
                    stroke:           ga('stroke')        || node.style?.stroke       || '',
                    fill:             ga('fill')          || node.style?.fill         || '',
                    'stroke-width':   ga('stroke-width')  || node.style?.strokeWidth  || '1',
                    class:            cls,
                    'data-geo-class': geoClass,
                    'data-symbol':    ga('data-symbol'),
                    d:                tag === 'path' ? ga('d') : null,
                    points:           ga('points'),
                    cx: ga('cx'), cy: ga('cy'), r:  ga('r'),
                    rx: ga('rx'), ry: ga('ry'),
                    x:  ga('x'),  y:  ga('y'),  width: ga('width'), height: ga('height'),
                    x1: ga('x1'), y1: ga('y1'), x2:   ga('x2'),    y2:     ga('y2'),
                },
                transform: ga('transform'),
            });
        }
        return result;
    }
}

/* ── Module-level helper (not on prototype) ──────────────── */
function _scoreFromBBox(bbox, geoClass) {
    const { x, y, width: bw, height: bh } = bbox;
    const pts = [x,y, x+bw,y, x+bw,y+bh, x,y+bh, x,y];
    return {
        bbox,
        aspect:      bw>0&&bh>0 ? Math.max(bw,bh)/Math.min(bw,bh) : 1,
        linearity:   geoClass==='wire' ? 1.0 : 0.0,
        circularity: geoClass==='wire' ? 0.0 : 1.0,
        pathLen:0, span:0, pts,
    };
}
