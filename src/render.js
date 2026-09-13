// Renders a packed coverage-tree layout (see layout.js) into a single,
// deterministic ANSI text frame: every file (and every empty directory,
// which still occupies its own footprint) becomes a rectangular "building".
// The fill glyph encodes its lines of code — more code, denser fill, taller
// looking building — and its colour is bucketed from its coverage
// percentage. This draws one frame at a time; `bin/covertown.js` calls it
// again after every keypress (see navigate.js) to redraw the city as the
// cursor moves, with the current selection passed in as `options.highlight`.

const RESET = '\x1b[0m';

// Coverage colour buckets, worst to best. `min` is an inclusive lower bound;
// the last bucket whose `min` the percentage clears wins.
const COVERAGE_BUCKETS = [
  { min: 0, code: '31' }, // red    — under 50%
  { min: 50, code: '33' }, // yellow — 50% up to 80%
  { min: 80, code: '32' }, // green  — 80% and above
];

// Returns the ANSI SGR colour code (as a string, without the escape prefix)
// for a coverage percentage.
export function coverageColor(pct) {
  let code = COVERAGE_BUCKETS[0].code;
  for (const bucket of COVERAGE_BUCKETS) {
    if (pct >= bucket.min) code = bucket.code;
  }
  return code;
}

// "Building height" glyphs, shortest to tallest, driven by lines of code.
// Fixed thresholds (rather than normalising against the tallest file in the
// report) keep a single file's glyph stable no matter what else is in the
// tree, which is what makes frame output deterministic per-node.
const HEIGHT_GLYPHS = [
  { min: 0, glyph: '\u2591' }, // ░ — under 20 lines
  { min: 20, glyph: '\u2592' }, // ▒ — 20 up to 100 lines
  { min: 100, glyph: '\u2593' }, // ▓ — 100 up to 300 lines
  { min: 300, glyph: '\u2588' }, // █ — 300 lines and up
];

// Returns the fill glyph for a lines-of-code count.
export function heightGlyph(loc) {
  let glyph = HEIGHT_GLYPHS[0].glyph;
  for (const step of HEIGHT_GLYPHS) {
    if (loc >= step.min) glyph = step.glyph;
  }
  return glyph;
}

// A node is a "building" (gets painted as a filled rectangle) once it has no
// children to recurse into: every file, and every directory that turned out
// to be empty. Non-empty directories are transparent — their rectangle is
// exactly covered by their children, so painting it separately would only
// ever be overdrawn.
function isBuilding(node) {
  return node.type === 'file' || !node.children || node.children.length === 0;
}

function paint(node, grid) {
  if (isBuilding(node)) {
    const cell = { glyph: heightGlyph(node.loc), color: coverageColor(node.coveragePct) };
    for (let row = node.y; row < node.y + node.height; row++) {
      for (let col = node.x; col < node.x + node.width; col++) {
        grid[row][col] = cell;
      }
    }
    return;
  }

  for (const child of node.children) paint(child, grid);
}

// Marks every already-painted cell inside `rect` as reverse-video, so the
// building currently under the navigation cursor (see navigate.js) stands
// out from the rest of the city without changing its underlying colour.
// Cells outside the grid (a stale or out-of-range rect) are skipped rather
// than throwing, so a highlight never breaks the base render.
function applyHighlight(grid, rect) {
  if (!rect) return;

  for (let row = rect.y; row < rect.y + rect.height; row++) {
    if (row < 0 || row >= grid.length) continue;
    for (let col = rect.x; col < rect.x + rect.width; col++) {
      if (col < 0 || col >= grid[row].length) continue;
      const cell = grid[row][col];
      if (cell) grid[row][col] = { ...cell, reverse: true };
    }
  }
}

// The full SGR parameter string for a cell, or null for a blank (unpainted)
// cell. Combining colour and reverse-video into one code lets the line
// builder below batch escapes exactly like it already does for colour runs.
function cellStyle(cell) {
  if (!cell) return null;
  return cell.reverse ? `${cell.color};7` : cell.color;
}

// Renders a laid-out tree (the output of `buildLayout`) into a single string:
// `layout.height` lines joined by `\n`, each `layout.width` glyphs wide,
// wrapped in ANSI colour escapes. Calling this repeatedly on the same layout
// and options always produces exactly the same string.
//
// `options.highlight`, if given, is a `{x, y, width, height}` rectangle
// (absolute layout coordinates) drawn in reverse video — used to show the
// current navigation selection without altering the layout itself.
export function renderFrame(layout, options = {}) {
  const { highlight } = options;
  const grid = Array.from({ length: layout.height }, () => new Array(layout.width).fill(null));

  paint(layout, grid);
  applyHighlight(grid, highlight);

  return grid
    .map((row) => {
      let line = '';
      let currentStyle = null;

      for (const cell of row) {
        const style = cellStyle(cell);
        if (style !== currentStyle) {
          line += style ? `\x1b[${style}m` : RESET;
          currentStyle = style;
        }
        line += cell ? cell.glyph : ' ';
      }

      if (currentStyle !== null) line += RESET;
      return line;
    })
    .join('\n');
}
