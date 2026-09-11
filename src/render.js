// Renders a packed coverage-tree layout (see layout.js) into a single,
// deterministic ANSI text frame: every file (and every empty directory,
// which still occupies its own footprint) becomes a rectangular "building".
// The fill glyph encodes its lines of code — more code, denser fill, taller
// looking building — and its colour is bucketed from its coverage
// percentage. This only draws one static frame from a layout; walking /
// scrolling around the city lands in a later milestone.

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

// Renders a laid-out tree (the output of `buildLayout`) into a single string:
// `layout.height` lines joined by `\n`, each `layout.width` glyphs wide,
// wrapped in ANSI colour escapes. Calling this repeatedly on the same layout
// always produces exactly the same string.
export function renderFrame(layout) {
  const grid = Array.from({ length: layout.height }, () => new Array(layout.width).fill(null));

  paint(layout, grid);

  return grid
    .map((row) => {
      let line = '';
      let currentColor = null;

      for (const cell of row) {
        const color = cell ? cell.color : null;
        if (color !== currentColor) {
          line += color ? `\x1b[${color}m` : RESET;
          currentColor = color;
        }
        line += cell ? cell.glyph : ' ';
      }

      if (currentColor !== null) line += RESET;
      return line;
    })
    .join('\n');
}
