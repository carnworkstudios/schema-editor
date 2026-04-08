# Schematics Editor

Schematics Editor is a powerful, browser-native vector design environment specifically optimized for electrical schematics, PCB design, UML diagrams, and architectural floorplans. Built with high-performance SVG rendering, it offers touch-optimized controls and interactive 3D visualization.

## 🚀 Key Features

*   **Touch-Optimized Canvas**: Smooth pan and zoom with support for stylus and multi-touch gestures.
*   **Domain-Specific Modes**:
    *   **⚡ Electrical**: Specialized symbol libraries for circuit and PCB design.
    *   **◈ UML**: Comprehensive tools for software architecture and flowcharts.
    *   **⬛ Floorplan**: Precision layout tools for architectural planning.
*   **Intelligent Connectivity**: Manhattan-style wiring with 45° smooth bends and real-time wire tracing.
*   **3D Presentation**: Advanced view transformations including Tilt, Yaw, and Perspective controls.
*   **Precision Tools**: Snapping grid, layer management, and a calibrated measurement system (Metric/Imperial).
*   **Multi-Format Support**: Import and export SVG, PDF, HPGL, DWF, and JSON.

## 📚 Documentation

Detailed guides are available to help you master the Schematics Editor:

*   **[Getting Started](docs/getting-started.md)**: Introduction to canvas setup, navigation, and the basic drawing workflow.
*   **[Domain Modes](docs/modes.md)**: Explore specialized tools for Electrical, UML, and Floorplan design.
*   **[Features Reference](docs/features.md)**: Technical guide to wiring, connectivity tracing, and 3D visualization.
*   **[Architecture Overview](docs/ARCHITECTURE.md)**: (Optional) Technical deep-dive into the rendering and geometry engine.

## 🏁 Getting Started

### Requirements
*   A modern web browser (Chrome, Firefox, Safari, Edge).
*   Mouse or Touchscreen (Touch-optimized features enabled automatically).

### Setup and Running
1.  Navigate to the `src/` directory.
2.  Open `index.html` in your browser.
3.  Alternatively, use a local server:
    ```bash
    npx http-server ./src
    ```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 GINEXYS
