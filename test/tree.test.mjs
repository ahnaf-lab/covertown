import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTree } from '../src/tree.js';

test('nests files under their directories', () => {
  const tree = buildTree({
    'src/a.js': { loc: 10, covered: 10 },
    'src/nested/b.js': { loc: 4, covered: 0 },
  });

  assert.equal(tree.type, 'dir');
  const src = tree.children.find((c) => c.name === 'src');
  assert.ok(src);
  assert.equal(src.type, 'dir');

  const a = src.children.find((c) => c.name === 'a.js');
  assert.equal(a.type, 'file');
  assert.equal(a.coveragePct, 100);

  const nested = src.children.find((c) => c.name === 'nested');
  assert.equal(nested.type, 'dir');
  assert.equal(nested.children[0].name, 'b.js');
});

test('aggregates loc and coverage up through directories', () => {
  const tree = buildTree({
    'src/a.js': { loc: 10, covered: 10 },
    'src/b.js': { loc: 10, covered: 0 },
  });

  const src = tree.children.find((c) => c.name === 'src');

  assert.equal(src.loc, 20);
  assert.equal(src.coveragePct, 50);
  assert.equal(tree.loc, 20);
  assert.equal(tree.coveragePct, 50);
});

test('sorts directories before files, then alphabetically', () => {
  const tree = buildTree({
    'z.js': { loc: 1, covered: 1 },
    'a.js': { loc: 1, covered: 1 },
    'lib/x.js': { loc: 1, covered: 1 },
  });

  assert.deepEqual(
    tree.children.map((c) => c.name),
    ['lib', 'a.js', 'z.js'],
  );
});
