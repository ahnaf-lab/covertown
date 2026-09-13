# covertown

A terminal TUI that turns a coverage report into a walkable city: each file
is a building sized by lines of code and colored by coverage percentage,
navigable with the arrow keys. Built for developers who want to feel their
blind spots, not just read a percentage.

So far this covers parsing lcov and Istanbul JSON coverage reports into a
per-file `{loc, coveragePct}` model, arranging that into a directory tree,
packing the tree into a deterministic, treemap-style grid (every file and
directory gets an integer `{x, y, width, height}` footprint sized by lines of
code, with each directory's children packed entirely inside that directory's
own rectangle so the layout stays grouped by folder), and drawing that grid
as an ANSI frame: every file becomes a rectangular building whose fill glyph
gets denser as its line count grows and whose colour is bucketed from its
coverage percentage (red under 50%, yellow up to 80%, green from 80%). When
run at a real terminal, the city is walkable: arrow keys move a highlighted
cursor between buildings, enter drills into a directory as its own district,
and backspace steps back out — the breadcrumb trail and the selected
building's stats are printed above and below each frame. Run somewhere
without a TTY (or pass `--static`), and it just draws a single frame and
exits.

## Install

```
npm install
```

No external dependencies — this project is built entirely on the Node
standard library.

## Usage

Walk a coverage report as a city, sized to the current terminal:

```
node bin/covertown.js path/to/coverage.info          # lcov
node bin/covertown.js path/to/coverage-final.json    # Istanbul raw
node bin/covertown.js path/to/coverage-summary.json  # Istanbul summary
```

When stdin and stdout are both a real terminal, this starts interactively:
arrow keys move between buildings, enter drills into a directory as its own
district, backspace steps back out, and `q` (or Ctrl-C) quits.

Options:

```
node bin/covertown.js coverage.info --width 100 --height 30  # override the frame size
node bin/covertown.js coverage.info --json                   # print the parsed model instead of drawing it
node bin/covertown.js coverage.info --static                 # draw one frame and exit, even at a real terminal
```

Or use the parser, layout engine and renderer as a library:

```js
import { parseCoverage } from './src/index.js';
import { buildLayout } from './src/layout.js';
import { renderFrame } from './src/render.js';
import { readFileSync } from 'node:fs';

const { files, tree } = parseCoverage(readFileSync('coverage.info', 'utf8'));

// files: { "src/a.js": { loc: 10, coveragePct: 70 }, ... }
// tree:  { name: ".", type: "dir", loc, coveragePct, children: [...] }

const city = buildLayout(tree, { width: 80, height: 24 });

// city: the same tree, with every node given an integer
// { x, y, width, height } footprint sized by lines of code, packed so each
// directory's children stay entirely inside that directory's own rectangle.

const frame = renderFrame(city);

// frame: a single string, `city.height` lines joined by "\n", each
// `city.width` glyphs wide, wrapped in ANSI colour codes bucketed from
// coverage percentage. Rendering the same layout always produces the same
// string.
```

Both lcov (`SF`/`LF`/`LH`/`DA` records) and Istanbul JSON (both the raw
`coverage-final.json` shape and the aggregated `coverage-summary.json` shape)
are auto-detected from the input.

## Status

Built autonomously and gated on passing tests: every change here has to pass
its test suite before it ships.

Run the tests:

```
npm test
```
