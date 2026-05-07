/* ============================================================
   ginexys-schema-engine — public API entry point

   Two tiers of engine access:

   1. Spatial primitives (browser + worker, zero DOM):
        KDTree2D    — O(log n) nearest-neighbour queries
        QuadTree2D  — O(log n) bounding-box range queries
        CameraMatrix — affine 2D pan/zoom/rotate with SVG matrix sync

   2. Topology engine (worker-safe, zero DOM):
        PDFGeometryEngine — 4-phase SVG topology analysis pipeline
          Phase 1: transform baking (DOMMatrix/DOMPoint, worker-native)
          Phase 2: geometric classification (linearity + circularity)
          Phase 3: vertex snapping + port discovery (KDTree2D)
          Phase 4: adjacency graph (nodes, edges, junctions)

   Browser CDN — full editor context:
     <script src="src/js/core/cameraMatrix.js"></script>
     <script src="src/js/core/kdTree.js"></script>
     <script src="src/js/core/quadTree.js"></script>
     <script src="src/js/core/geometry-engine.standalone.js"></script>
     <script src="src/js/core/engine.js"></script>

   Web Worker usage:
     importScripts('kdTree.js', 'geometry-engine.standalone.js');
     const descriptors = PDFGeometryEngine.serialize(svgElement); // main thread
     // postMessage(descriptors) → worker:
     const result = new PDFGeometryEngine({ eps: 0.5 }).analyze(descriptors);
     // result: { wires, components, connectors, graph, ports }

   npm / ES module support planned for a future release.
   ============================================================ */
(function (global) {
    global.GinexysEngine = {
        /** 2D k-d tree — O(log n) nearest-neighbour spatial queries */
        KDTree2D,
        /** 2D quad-tree — O(log n) bounding-box range queries */
        QuadTree2D,
        /** Affine 2D camera transform — pan, zoom, rotate with SVG matrix sync */
        CameraMatrix,
        /** Worker-safe 4-phase SVG topology analysis — accepts plain JS descriptors */
        PDFGeometryEngine,
        version: '1.1.0',
    };
})(window);
