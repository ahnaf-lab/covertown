#!/usr/bin/env node
// This milestone only wires up parsing: read a local coverage report and
// print the resulting {loc, coveragePct} model. The walkable TUI city view
// lands in a later milestone.
import { readFileSync } from 'node:fs';
import { parseCoverage } from '../src/index.js';

function main(argv) {
  const inputPath = argv[2];

  if (!inputPath) {
    process.stderr.write('usage: covertown <coverage-file>\n');
    process.exitCode = 1;
    return;
  }

  let content;
  try {
    content = readFileSync(inputPath, 'utf8');
  } catch (err) {
    process.stderr.write(`covertown: could not read ${inputPath}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  let model;
  try {
    model = parseCoverage(content);
  } catch (err) {
    process.stderr.write(`covertown: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
}

main(process.argv);
