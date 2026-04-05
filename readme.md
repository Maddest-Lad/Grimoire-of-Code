# Grimoire of Code (Web Edition)

A web application that transmutes source code into stylized **magic circles** — each script rendered as a sigil whose geometry encodes its structure, control flow, and dependencies.

## Concept
Code is already structured, hierarchical, and symbolic. This grimoire reframes that structure as ritual geometry:
- **Loops** become spirals and cyclic patterns.
- **Conditionals** become binary, contrasting designs.
- **Try / except / finally** become nested, layered wards.
- **Classes and objects** become pentagrams and hexagrams.

## Architecture
The project is a real-time React application that parses code in the browser:

1. **Editor:** Code is entered into a Monaco Editor pane.
2. **Parser (Web Worker):** `web-tree-sitter` parses the code (tolerating syntax errors during live typing) and generates an Intermediate Representation (IR).
3. **Layout Engine:** The IR is mapped to geometric coordinates (a `LaidOut` tree).
4. **Renderer:** React and Framer Motion render and animate the SVG magic circle dynamically.

## Tech Stack
- **Vite**, **React 19**, **TypeScript**
- **Tailwind CSS v4** for UI styling.
- **Zustand** for state management.
- **web-tree-sitter** for robust, multi-language parsing.
- **Framer Motion** for declarative SVG animations.
