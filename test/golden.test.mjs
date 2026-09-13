// Golden-file test: a fixed lcov fixture must render to an exact,
// byte-for-byte ANSI frame every time. Unlike the other render tests, which
// assert on small hand-built trees, this exercises the full pipeline
// (parse -> tree -> layout -> render) against a realistic, multi-directory
// input and pins the *entire* output, catching any change to layout packing,
// colour bucketing or escape-sequence formatting that the unit tests don't
// happen to cover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCoverage } from '../src/index.js';
import { buildLayout } from '../src/layout.js';
import { renderFrame } from '../src/render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, 'fixtures', 'city.lcov');
const goldenPath = path.join(here, 'fixtures', 'city.golden.txt');

// Fixed so the golden frame never depends on the terminal running the test.
const LAYOUT_SIZE = { width: 40, height: 12 };

function renderFixture() {
  const content = readFileSync(fixturePath, 'utf8');
  const { tree } = parseCoverage(content);
  const layout = buildLayout(tree, LAYOUT_SIZE);
  return renderFrame(layout);
}

test('fixed lcov fixture renders to the exact stored golden frame', () => {
  const golden = readFileSync(goldenPath, 'utf8');
  const frame = renderFixture();

  assert.equal(frame, golden);
});

test('golden frame has the expected structural shape', () => {
  const golden = readFileSync(goldenPath, 'utf8');
  const lines = golden.split('\n');
  const stripAnsi = (line) => line.replace(/\x1b\[\d+(?:;\d+)?m/g, '');

  assert.equal(lines.length, LAYOUT_SIZE.height);
  for (const line of lines) {
    assert.equal(stripAnsi(line).length, LAYOUT_SIZE.width);
  }
});

test('re-rendering the fixture is still byte-for-byte identical to the golden file', () => {
  const golden = readFileSync(goldenPath, 'utf8');

  assert.equal(renderFixture(), golden);
  assert.equal(renderFixture(), golden);
});
