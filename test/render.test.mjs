import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree } from '../src/tree.js';
import { buildLayout } from '../src/layout.js';
import { coverageColor, heightGlyph, renderFrame } from '../src/render.js';

test('coverageColor buckets percentages into red/yellow/green at the right edges', () => {
  assert.equal(coverageColor(0), '31');
  assert.equal(coverageColor(49), '31');
  assert.equal(coverageColor(50), '33');
  assert.equal(coverageColor(79), '33');
  assert.equal(coverageColor(80), '32');
  assert.equal(coverageColor(100), '32');
});

test('heightGlyph steps up as lines of code increase', () => {
  assert.equal(heightGlyph(0), '\u2591');
  assert.equal(heightGlyph(19), '\u2591');
  assert.equal(heightGlyph(20), '\u2592');
  assert.equal(heightGlyph(99), '\u2592');
  assert.equal(heightGlyph(100), '\u2593');
  assert.equal(heightGlyph(299), '\u2593');
  assert.equal(heightGlyph(300), '\u2588');
});

test('renders a single fully-covered file as a solid green block', () => {
  const tree = buildTree({ 'a.js': { loc: 5, covered: 5 } });
  const layout = buildLayout(tree, { width: 3, height: 2 });

  const frame = renderFrame(layout);

  assert.equal(frame, '\u001b[32m\u2591\u2591\u2591\u001b[0m\n\u001b[32m\u2591\u2591\u2591\u001b[0m');
});

test('adjacent buildings with different coverage get separate colour runs in the same row', () => {
  const tree = buildTree({
    'a.js': { loc: 5, covered: 5 }, // 100% -> green
    'b.js': { loc: 5, covered: 0 }, // 0%   -> red
  });
  const layout = buildLayout(tree, { width: 4, height: 1 });

  const frame = renderFrame(layout);

  assert.equal(frame, '\u001b[32m\u2591\u2591\u001b[31m\u2591\u2591\u001b[0m');
});

test('frame has exactly one line per layout row and every line is the same visible width', () => {
  const tree = buildTree({
    'src/a.js': { loc: 12, covered: 6 },
    'src/nested/b.js': { loc: 250, covered: 250 },
    'lib/c.js': { loc: 3, covered: 0 },
  });
  const layout = buildLayout(tree, { width: 30, height: 10 });

  const frame = renderFrame(layout);
  const lines = frame.split('\n');
  const stripAnsi = (line) => line.replace(/\x1b\[\d+m/g, '');

  assert.equal(lines.length, layout.height);
  for (const line of lines) {
    assert.equal(stripAnsi(line).length, layout.width);
  }
});

test('rendering the same layout twice is byte-for-byte identical', () => {
  const tree = buildTree({
    'src/a.js': { loc: 40, covered: 10 },
    'src/b.js': { loc: 8, covered: 8 },
    'e.js': { loc: 400, covered: 200 },
  });
  const layout = buildLayout(tree, { width: 50, height: 20 });

  assert.equal(renderFrame(layout), renderFrame(layout));
});
