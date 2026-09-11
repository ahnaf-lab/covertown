# covertown

A terminal TUI that turns a coverage report into a walkable city: each file
is a building sized by lines of code and colored by coverage percentage,
navigable with the arrow keys. Built for developers who want to feel their
blind spots, not just read a percentage.

So far this covers parsing lcov and Istanbul JSON coverage reports into a
per-file `{loc, coveragePct}` model, arranging that into a directory tree, and
packing the tree into a deterministic, treemap-style grid: every file and
directory gets an integer `{x, y, width, height}` footprint sized by lines of
code, with each directory's children packed entirely inside that directory's
own rectangle so the layout stays grouped by folder. The walkable rendering
itself lands in a later milestone.

## Install

```
npm install
```

No external dependencies — this project is built entirely on the Node
standard library.

## Usage

Parse a coverage report and print the resulting model as JSON:

```
node bin/covertown.js path/to/coverage.info      # lcov
node bin/covertown.js path/to/coverage-final.json  # Istanbul raw
node bin/covertown.js path/to/coverage-summary.json  # Istanbul summary
```

Or use the parser and layout engine as a library:

```js
import { parseCoverage } from './src/index.js';
import { buildLayout } from './src/layout.js';
import { readFileSync } from 'node:fs';

const { files, tree } = parseCoverage(readFileSync('coverage.info', 'utf8'));

// files: { "src/a.js": { loc: 10, coveragePct: 70 }, ... }
// tree:  { name: ".", type: "dir", loc, coveragePct, children: [...] }

const city = buildLayout(tree, { width: 80, height: 24 });

// city: the same tree, with every node given an integer
// { x, y, width, height } footprint sized by lines of code, packed so each
// directory's children stay entirely inside that directory's own rectangle.
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
