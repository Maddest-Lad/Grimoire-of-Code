# Grimoire of Code

A compiler that transmutes source code into stylized **magic circles** — each script rendered as a sigil whose geometry encodes its structure, control flow, and dependencies.

## Concept

Code is already structured, hierarchical, and symbolic. A grimoire reframes that structure as ritual geometry:

- **Loops** become spirals and cyclic patterns
- **Conditionals** become binary, contrasting designs
- **Try / except / finally** become nested, layered wards
- **Classes and objects** become pentagrams and hexagrams
- **Variables** become geometric shapes, coloured by scope and type
- **Functions** become satellite circles, linked to the main sigil
- **Libraries and modules** become larger enclosing designs that contain their functions
- **Identifiers** are transliterated into a runic alphabet woven into the circle

Visual grammar (colour coding, layering, transparency, symbol choice) is driven by an editable theme file so the grimoire can be reskinned without touching code. An N-level import slider controls how deep library traversal runs — `depth=1` shows direct imports only, `depth=2` pulls in imports-of-imports, and so on.

## Architecture

The project is a three-stage pipeline joined by a single data contract — a language-agnostic **Intermediate Representation (IR)**:

```
 source code ──► [ frontend ] ──► IR ──► [ resolver ] ──► expanded IR ──► [ renderer ] ──► SVG
                 ANTLR+visitor          N-level imports                    layout+theme
```

Each stage is a pure transformation. The IR is the keystone: frontends (per language) and renderers (per output format) can be added independently, and every module in between only ever speaks IR.

### Layout

```
grimoire-of-code/
├── main.py                  # CLI entry — the whole pipeline in ~10 lines
├── grammars/                # vendored ANTLR grammars (from antlr/grammars-v4)
├── grimoire/
│   ├── ir.py                # IR dataclasses + JSON (de)serialization
│   ├── parse/               # ANTLR parse tree → IR (one submodule per language)
│   ├── imports.py           # recursive N-level import expansion
│   └── render/
│       ├── layout.py        # IR → geometric positions
│       ├── runes.py         # identifier → runic glyphs
│       ├── theme.py         # theme.toml loader + semantic→style mapping
│       └── svg.py           # laid-out IR + theme → SVG
├── themes/default.toml      # colours, strokes, symbols, fonts
└── tests/fixtures/          # sample inputs + expected IR snapshots
```

See [`plan.md`](plan.md) for the full implementation plan, per-system steps, and data contracts.

## Scope for v1

- **One language: Python.** The architecture admits more trivially, but v1 ships one complete vertical slice.
- **One output: SVG.** Vector, scalable, layerable, easy to emit.
- **One UI: CLI.** The pipeline is a pure function `(source, config) → SVG`, so any future GUI (Tk, Qt, web) becomes a thin wrapper.

## Usage (target)

```bash
python main.py path/to/script.py --depth 2 --theme default -o grimoire.svg
```
