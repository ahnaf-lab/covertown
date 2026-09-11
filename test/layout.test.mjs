import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree } from '../src/tree.js';
import { buildLayout } from '../src/layout.js';

function flatten(node, acc = []) {
  acc.push(node);
  for (const child of node.children ?? []) flatten(child, acc);
  return acc;
}

function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test('root covers the full requested viewport', () => {
  const tree = buildTree({ 'a.js': { loc: 10, covered: 5 } });
  const layout = buildLayout(tree, { width: 40, height: 20 });

  assert.deepEqual({ x: layout.x, y: layout.y, width: layout.width, height: layout.height }, {
    x: 0,
    y: 0,
    width: 40,
    height: 20,
  });
});

test('a directory bounding box exactly contains all of its children', () => {
  const tree = buildTree({
    'src/a.js': { loc: 30, covered: 30 },
    'src/nested/b.js': { loc: 5, covered: 0 },
    'top.js': { loc: 1, covered: 1 },
  });
  const layout = buildLayout(tree, { width: 50, height: 24 });

  function checkContainment(node) {
    for (const child of node.children ?? []) {
      assert.ok(child.x >= node.x, `${child.path} x within parent`);
      assert.ok(child.y >= node.y, `${child.path} y within parent`);
      assert.ok(child.x + child.width <= node.x + node.width, `${child.path} right edge within parent`);
      assert.ok(child.y + child.height <= node.y + node.height, `${child.path} bottom edge within parent`);
      checkContainment(child);
    }
  }

  checkContainment(layout);
});

test('sibling rectangles never overlap and no space is left ungrouped', () => {
  const tree = buildTree({
    'src/a.js': { loc: 40, covered: 20 },
    'src/b.js': { loc: 20, covered: 20 },
    'lib/c.js': { loc: 10, covered: 0 },
    'lib/d.js': { loc: 10, covered: 10 },
    'e.js': { loc: 5, covered: 5 },
  });
  const layout = buildLayout(tree, { width: 60, height: 30 });

  function checkSiblings(node) {
    if (node.type !== 'dir') return;
    const children = node.children ?? [];
    if (children.length === 0) return;

    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        assert.ok(!overlaps(children[i], children[j]), `${children[i].path} overlaps ${children[j].path}`);
      }
    }

    const vertical = node.width >= node.height;
    const total = children.reduce((sum, c) => sum + (vertical ? c.width : c.height), 0);
    assert.equal(total, vertical ? node.width : node.height, `${node.path} children fill the axis exactly`);

    for (const child of children) checkSiblings(child);
  }

  checkSiblings(layout);
});

test('every file gets a visible footprint when there is room for one', () => {
  const tree = buildTree({
    'a.js': { loc: 1, covered: 0 },
    'b.js': { loc: 1000, covered: 1000 },
    'dir/c.js': { loc: 0, covered: 0 },
  });
  const layout = buildLayout(tree, { width: 60, height: 24 });

  for (const node of flatten(layout)) {
    if (node.type !== 'file') continue;
    assert.ok(node.width >= 1, `${node.path} has visible width`);
    assert.ok(node.height >= 1, `${node.path} has visible height`);
  }
});

test('layout is deterministic across repeated calls on the same input', () => {
  const tree = buildTree({
    'src/a.js': { loc: 12, covered: 6 },
    'src/nested/b.js': { loc: 7, covered: 7 },
    'lib/c.js': { loc: 3, covered: 0 },
  });

  const first = buildLayout(tree, { width: 45, height: 22 });
  const second = buildLayout(tree, { width: 45, height: 22 });

  assert.deepEqual(first, second);
});

test('rejects a non-positive or non-integer viewport', () => {
  const tree = buildTree({ 'a.js': { loc: 1, covered: 1 } });

  assert.throws(() => buildLayout(tree, { width: 0, height: 10 }), /positive integer/);
  assert.throws(() => buildLayout(tree, { width: 10.5, height: 10 }), /positive integer/);
});
