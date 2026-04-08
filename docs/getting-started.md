# Getting Started with Schematics Editor

The Schematics Editor is a powerful, browser-native vector drawing tool designed for creating electrical schematics, UML diagrams, and floor plans. Built on SVG technology, it offers touch-optimized controls and 3D visualization capabilities.

## Core Workflow

1.  **Initialize Canvas**: Start with a blank canvas or import an existing diagram.
2.  **Select Mode**: Choose a domain-specific mode (Electrical, UML, Floorplan) to access specialized symbols.
3.  **Draw and Align**: Place components, draw connections, and use snapping for precision.
4.  **Analyze and Trace**: (Optional) Use tracing tools to verify electrical connectivity.
5.  **Export**: Save your work as SVG, JSON, or clean HTML.

---

## 1. Canvas Setup

### Creating a New Canvas
Select the **New** icon (📄) in the secondary toolbar. In the modal, specify:
*   **Canvas Name**: A descriptive title for your diagram.
*   **Dimensions**: Custom Width and Height in pixels.

### Loading Existing Files
Select the **Load** icon (📂) to import files. The editor supports:
*   **Vector**: SVG, SVGZ.
*   **Legacy/CAD**: HPGL, PLT, DWF.
*   **Documents**: PDF (rendering each page as an independent track).
*   **Images**: PNG, JPG, BMP, TIFF (converted to SVG paths using browser-native tracing).

---

## 2. Navigation and View Controls

The editor provides multiple ways to navigate complex diagrams.

### Basic Navigation
*   **Pan**: Click and drag with the **Select** tool (or use two-finger drag on touch devices).
*   **Zoom**: Use the mouse wheel, the **Zoom In/Out** buttons in the bottom toolbar, or the Zoom slider in the side panel.
*   **Fit View**: Select **Fit View** (⛶) to automatically center and scale the diagram to fill the screen.

### 3. Advanced Visualization (3D View)
Open the **Side Panel** and navigate to the **View Controls** section to manipulate the canvas in 3D space:
| Control | Description |
| :--- | :--- |
| **Rotation** | Rotates the entire canvas around the Z-axis. |
| **Pitch** | Tilts the canvas forward or backward (Rotate X). |
| **Yaw** | Tilts the canvas left or right (Rotate Y). |
| **Perspective** | Adjusts the viewing distance to emphasize or flatten the 3D effect. |

---

## 3. Basic Drawing Workflow

### Selecting Tools
Most drawing tools can be activated via the **Edit** section of the accordion toolbar or via keyboard shortcuts:
*   `V`: Select Tool
*   `P`: Pen (Freehand)
*   `L`: Line
*   `R`: Rectangle
*   `E`: Ellipse
*   `T`: Text

### Snap and Grid
Enable the **Grid** (G) and **Snap** to ensure components align perfectly. Use the **Grid Size** dropdown in the side panel to adjust the snapping increment (10px, 20px, or 50px).

### Managing Elements
*   **Selection**: Click an element to select it. Hold `Shift` to multi-select.
*   **Transformation**: Once selected, use the **Side Panel > Properties** tab to modify coordinates, dimensions, and rotation precisely.
*   **Arrangement**: Use the **Group** (Ctrl+G) and **Ungroup** (Ctrl+Shift+G) buttons to manage complex components.

---

## 4. Exporting Your Work

Navigate to the **Export** section in the toolbar:
1.  **SVG**: Standard vector format for use in other design tools.
2.  **HTML**: A self-contained file including the diagram and interactive viewing logic.
3.  **JSON**: Raw diagram data for programmatic use within the GENIXY ecosystem.
4.  **Batch**: If multiple diagrams are loaded in the **Timeline**, use Batch Export to save all tracks as separate SVG files simultaneously.
