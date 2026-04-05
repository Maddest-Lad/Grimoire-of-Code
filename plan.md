# Grimoire of Code — Web Edition Specification

## 1. Objective
Reimplement "Grimoire of Code" as a modern, interactive web application. The application will transmute code snippets into stylized magic circle SVGs in real-time, functioning directly in the browser without a backend.

## 2. Interface & User Experience
- **Split-Pane Layout:** 
  - **Left Pane (Input):** A robust code editor (Monaco Editor) for single-file text entry.
  - **Right Pane (Output):** A live, animated SVG visualization of the magic circle.
- **Language Controls:** 
  - Autodetection system to guess the language based on keywords/syntax.
  - A dropdown menu to manually override the detected language.
- **Real-time Feedback:** 
  - Visualization updates automatically as the user types (debounced).

## 3. Proposed Tech Stack
- **Build Tool:** Vite 7.3
- **Language:** TypeScript ~5.9
- **UI Framework:** React 19
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand 5 (for editor state, language, theme)
- **Code Editor:** `@monaco-editor/react`
- **Language Detection:** `highlight.js` (core only) or `franc-min`
- **Animation Framework:** `framer-motion` (for declarative SVG path animations)

## 4. Architectural Improvements
### A. Parsing
- **Tree-sitter (via `web-tree-sitter` WASM):** Parses instantly, handles syntax errors gracefully, and provides a uniform AST.
- **Web Worker:** Parsing will be offloaded to a Web Worker to prevent UI freezing.
- **Translation:** The Worker translates the Tree-sitter AST into the agnostic `IRNode` schema.

### B. Layout Engine
- The Python layout logic translates perfectly to pure TypeScript as a pure function: `(root: IRNode, canvasSize: Dimensions) -> LaidOut`.

### C. React SVG Renderer
- The renderer will be a tree of React components (`<MagicCircle />`, `<SatelliteNode />`, `<CallEdge />`).
- **Animation:** `framer-motion` animates the SVG elements (e.g., drawing lines and fading in nodes).
