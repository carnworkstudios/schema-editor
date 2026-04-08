# Domain Modes

The Schematics Editor features specialized modes that tailor the interface and symbol library to specific industries. Use the **Mode Switcher** pill in the secondary toolbar to change domains.

---

## 1. General Mode

The default vector drawing environment.

*   **Best For**: General-purpose illustrations, icon design, and freeform sketching.
*   **Symbol Palette**: Empty by default, allowing for maximum canvas space.
*   **Behavior**: Standard vector manipulation without specialized connectivity logic.

---

## 2. Electrical / PCB Mode ⚡

A specialized environment for creating circuit diagrams and wiring schematics.

*   **Best For**: Circuit design, electrical system mapping, and PCB layouts.
*   **Symbol Palette**: Includes standardized electrical components (Resistors, Capacitors, ICs, Transistors, and Connectors).
*   **Key Features**:
    *   **Pins & Terminals**: Components have predefined connection points.
    *   **Trace Integration**: Activating **Trace** mode highlights the specific path of an electrical signal through the diagram.
    *   **Smooth Routing**: Toggle **Smooth** to enable 45-degree bends in wiring, reducing visual clutter in complex schematics.

---

## 3. UML / Software Architecture ◈

Designed for software engineers and architects to map out system relationships.

*   **Best For**: Class diagrams, Flowcharts, Sequence diagrams, and System architecture.
*   **Symbol Palette**: Standard UML shapes including Actors, Classes, Interfaces, Databases, and Decision diamonds.
*   **Key Features**:
    *   **Auto-Flow**: Wires behave as relational arrows that can be customized with head/tail styles (Composition, Inheritance, etc.) via the Properties panel.
    *   **Text Integration**: Double-click any UML block to edit its name or attributes directly.

---

## 4. Floorplan Mode ⬛

A tool for architectural layout and interior planning.

*   **Best For**: Room layouts, HVAC mapping, and simple architectural floorplans.
*   **Symbol Palette**: Architectural symbols such as Walls, Doors, Windows, HVAC units, and basic furniture.
*   **Key Features**:
    *   **Measurement Sync**: Designed to be used with the **Metric** or **Imperial** measurement systems.
    *   **Coordinate Precision**: Every element has precise X/Y/W/H properties that translate to real-world dimensions based on the defined scale.

---

## Switching Modes

1.  Select the desired mode pill (e.g., **Electrical**) in the top toolbar.
2.  The **Symbol Palette** will automatically open on the left with the corresponding library.
3.  Drag symbols from the palette directly onto the canvas.
4.  Switch back to **General** to hide the palette and maximize your viewport.

> [!TIP]
> Each mode saves its own symbol layout. You can mix elements from multiple modes by dragging a symbol onto the canvas, switching modes, and then dragging another.
