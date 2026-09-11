import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoverage } from '../src/index.js';

test('parses lcov input end to end into files + tree', () => {
  const lcov = [
    'SF:src/a.js',
    'LF:10',
    'LH:5',
    'end_of_record',
  ].join('\n');

  const { files, tree } = parseCoverage(lcov);

  assert.deepEqual(files, { 'src/a.js': { loc: 10, coveragePct: 50 } });
  assert.equal(tree.type, 'dir');
  assert.equal(tree.loc, 10);
});

test('parses Istanbul JSON input end to end into files + tree', () => {
  const json = JSON.stringify({
    'src/a.js': { lines: { total: 4, covered: 4 } },
  });

  const { files } = parseCoverage(json);

  assert.deepEqual(files, { 'src/a.js': { loc: 4, coveragePct: 100 } });
});

test('rejects empty input', () => {
  assert.throws(() => parseCoverage(''), /empty coverage input/);
});

test('rejects JSON input with no recognisable file records', () => {
  assert.throws(() => parseCoverage('{}'), /no file records found/);
});

test('rejects a JSON array, which is neither lcov nor an Istanbul map', () => {
  assert.throws(() => parseCoverage('[1,2,3]'), /unrecognised coverage format/);
});
