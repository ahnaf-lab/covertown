import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLcov } from '../src/parseLcov.js';

test('reads loc/covered from LF/LH summary lines', () => {
  const lcov = [
    'TN:',
    'SF:src/a.js',
    'DA:1,1',
    'DA:2,0',
    'LF:2',
    'LH:1',
    'end_of_record',
  ].join('\n');

  const files = parseLcov(lcov);

  assert.deepEqual(files, { 'src/a.js': { loc: 2, covered: 1 } });
});

test('falls back to counting DA lines when LF/LH are missing', () => {
  const lcov = [
    'SF:src/b.js',
    'DA:1,4',
    'DA:2,0',
    'DA:3,2',
    'end_of_record',
  ].join('\n');

  const files = parseLcov(lcov);

  assert.deepEqual(files, { 'src/b.js': { loc: 3, covered: 2 } });
});

test('handles multiple file records in one report', () => {
  const lcov = [
    'SF:src/a.js',
    'LF:10',
    'LH:10',
    'end_of_record',
    'SF:src/b.js',
    'LF:4',
    'LH:0',
    'end_of_record',
  ].join('\n');

  const files = parseLcov(lcov);

  assert.equal(Object.keys(files).length, 2);
  assert.equal(files['src/a.js'].loc, 10);
  assert.equal(files['src/b.js'].covered, 0);
});
