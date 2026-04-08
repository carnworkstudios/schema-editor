# Features Reference

This document provides a detailed reference for the advanced tools available in the Schematics Editor.

---

## 1. Wiring and Connectivity

The Schematics Editor features a sophisticated connectivity engine specifically designed for electrical and logical diagrams.

### Manhattan Routing (`Wire` Tool)
The **Wire** tool (W) uses Manhattan routing, which ensures that connections only use horizontal and vertical lines with 90 or 45-degree bends.
*   **How to use**: Click a starting point, click to add anchor points, and double-click to finish.
*   **Smooth Bends**: Toggle the **Smooth** button in the toolbar to switch between sharp 90-degree corners and 45-degree chamfered bends.

### Tracing and Highlighting
Use the **Wiring** accordion in the toolbar to analyze your diagram's connectivity:
*   **Trace Mode (Toggle Switch)**: When ON, selecting a wire or component will highlight every connected element in real-time, allowing you to verify complete circuit paths.
*   **Highlight Components**: Automatically highlights all symbols on the canvas to distinguish them from background geometry.
*   **Show Connections**: Renders a temporary "netlist" overlay showing logical connections between pins.

---

## 2. Arrangement and Layers

### Layer Management
Open the **Side Panel** and select the **Layers** tab to manage the depth and visibility of your diagram.
*   **Tree View**: View all elements as a hierarchical list.
*   **Visibility (👁)**: Toggle the visibility of individual elements or groups.
*   **Locking (🔒)**: Prevent accidental transformation of background elements.
*   **Ordering**: Elements at the top of the list render in front of those below.

### Grouping logic
*   **Group (Ctrl+G)**: Combines selected elements into a single movable unit.
*   **Ungroup (Ctrl+Shift+G)**: Breaks a group back into its component parts.
*   **Nested Groups**: The editor supports infinite levels of grouping for complex component management.

---

## 3. Precision and Measurement

### The Measurement System
Select **Measure** (📏) in the bottom toolbar to configure the diagram scale.
*   **Units**: Switch between **Pixels**, **Metric** (mm, cm, m), and **Imperial** (in, ft, yd).
*   **Scale Calibration**: Set a custom scale (e.g., `100px = 1m`).
*   **Measurement Tool**: Once calibrated, clicking and dragging on the canvas will display real-world distances in the status bar.

---

## 4. 3D View Transformations

A unique feature of the Schematics Editor is the ability to view and present 2D vector diagrams in 3D space.

*   **Tilt/Pitch**: Tilts the diagram towards or away from the viewer.
*   **Yaw**: Rotates the diagram sideways.
*   **Zoom Slider**: Adjusts the overall scale while maintaining the 3D perspective.
*   **Reset View**: Instantly returns the canvas to a flat, 2D orientation at 100% scale.

> [!NOTE]
> All 3D transformations are visual only and do not affect the underlying X/Y coordinates of your components. Exporting to SVG will save the 2D representation, while exporting to HTML will preserve the interactive 3D capabilities.
