import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree } from '../src/tree.js';
import { buildLayout } from '../src/layout.js';
import {
  createNavState,
  handleKey,
  getCurrentNode,
  getSelectedNode,
  getBreadcrumb,
} from '../src/navigate.js';

function makeLayout(files, viewport = { width: 40, height: 20 }) {
  return buildLayout(buildTree(files), viewport);
}

test('starts at the root district with the first child selected', () => {
  const layout = makeLayout({ 'a.js': { loc: 10, covered: 10 }, 'b.js': { loc: 10, covered: 0 } });
  const state = createNavState(layout);

  assert.deepEqual(state, { path: [], selectedIndex: 0 });
  assert.equal(getCurrentNode(layout, state), layout);
  assert.equal(getSelectedNode(layout, state).name, 'a.js');
});

test('a report with nothing in the root district selects nothing', () => {
  const layout = makeLayout({}, { width: 10, height: 10 });
  const state = createNavState(layout);

  assert.equal(state.selectedIndex, -1);
  assert.equal(getSelectedNode(layout, state), null);
});

test('left/right move the selection between horizontally arranged siblings', () => {
  // Two top-level files in a wide viewport pack side by side.
  const layout = makeLayout({
    'a.js': { loc: 10, covered: 10 },
    'b.js': { loc: 10, covered: 10 },
  });
  let state = createNavState(layout);
  assert.equal(getSelectedNode(layout, state).name, 'a.js');

  state = handleKey(layout, state, 'right');
  assert.equal(getSelectedNode(layout, state).name, 'b.js');

  state = handleKey(layout, state, 'left');
  assert.equal(getSelectedNode(layout, state).name, 'a.js');
});

test('moving where there is no neighbour leaves the state unchanged', () => {
  const layout = makeLayout({ 'a.js': { loc: 10, covered: 10 }, 'b.js': { loc: 10, covered: 10 } });
  const state = createNavState(layout);

  const moved = handleKey(layout, state, 'left');
  assert.deepEqual(moved, state);
});

test('enter drills into a non-empty directory and lands on its first child', () => {
  const layout = makeLayout({
    'src/a.js': { loc: 10, covered: 10 },
    'src/b.js': { loc: 5, covered: 0 },
    'top.js': { loc: 1, covered: 1 },
  });
  // Directories sort before files (tree.js), so `src` is the first child.
  let state = createNavState(layout);
  assert.equal(getSelectedNode(layout, state).name, 'src');

  state = handleKey(layout, state, 'enter');

  assert.deepEqual(state.path, ['src']);
  assert.equal(getCurrentNode(layout, state).name, 'src');
  assert.equal(getSelectedNode(layout, state).name, 'a.js');
  assert.deepEqual(getBreadcrumb(layout, state), ['.', 'src']);
});

test('enter on a file does nothing', () => {
  const layout = makeLayout({ 'top.js': { loc: 1, covered: 1 } });
  const state = createNavState(layout);

  assert.equal(getSelectedNode(layout, state).type, 'file');
  assert.deepEqual(handleKey(layout, state, 'enter'), state);
});

test('back steps out of a district and restores selection to where it entered from', () => {
  const layout = makeLayout({
    'src/a.js': { loc: 10, covered: 10 },
    'top.js': { loc: 1, covered: 1 },
  });
  let state = createNavState(layout);
  state = handleKey(layout, state, 'enter'); // into src
  assert.deepEqual(state.path, ['src']);

  state = handleKey(layout, state, 'back');

  assert.deepEqual(state.path, []);
  assert.equal(getSelectedNode(layout, state).name, 'src');
});

test('back at the root is a no-op', () => {
  const layout = makeLayout({ 'a.js': { loc: 1, covered: 1 } });
  const state = createNavState(layout);

  assert.deepEqual(handleKey(layout, state, 'back'), state);
});

test('unrecognised keys leave the state unchanged', () => {
  const layout = makeLayout({ 'a.js': { loc: 1, covered: 1 }, 'b.js': { loc: 1, covered: 1 } });
  const state = createNavState(layout);

  assert.deepEqual(handleKey(layout, state, 'tab'), state);
});

test('drilling two levels deep tracks the full breadcrumb', () => {
  const layout = makeLayout({
    'src/nested/deep.js': { loc: 8, covered: 4 },
  });
  let state = createNavState(layout);
  state = handleKey(layout, state, 'enter'); // into src
  state = handleKey(layout, state, 'enter'); // into nested

  assert.deepEqual(getBreadcrumb(layout, state), ['.', 'src', 'nested']);
  assert.equal(getSelectedNode(layout, state).name, 'deep.js');
});
