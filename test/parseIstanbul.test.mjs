import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIstanbulJson } from '../src/parseIstanbul.js';

test('reads the summary shape (coverage-summary.json) directly', () => {
  const json = {
    'src/a.js': { lines: { total: 10, covered: 7, pct: 70 } },
    total: { lines: { total: 10, covered: 7, pct: 70 } },
  };

  const files = parseIstanbulJson(json);

  assert.deepEqual(files, { 'src/a.js': { loc: 10, covered: 7 } });
  assert.equal(files.total, undefined);
});

test('derives loc/covered from statement maps in the raw shape', () => {
  const json = {
    'src/b.js': {
      statementMap: { 0: {}, 1: {}, 2: {} },
      s: { 0: 3, 1: 0, 2: 1 },
    },
  };

  const files = parseIstanbulJson(json);

  assert.deepEqual(files, { 'src/b.js': { loc: 3, covered: 2 } });
});

test('skips entries that are neither summary nor raw shape', () => {
  const json = { 'src/c.js': { unexpected: true } };

  const files = parseIstanbulJson(json);

  assert.deepEqual(files, {});
});
