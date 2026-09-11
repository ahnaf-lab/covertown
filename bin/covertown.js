#!/usr/bin/env node
// Reads a local coverage report and draws it as a static ANSI-coloured
// frame: one call to parse -> layout -> render. Walking around the city
// (keyboard navigation, scrolling a viewport bigger than the terminal)
// lands in a later milestone; this one only ever draws a single frame.
import { readFileSync } from 'node:fs';
import { parseCoverage } from '../src/index.js';
import { buildLayout } from '../src/layout.js';
import { renderFrame } from '../src/render.js';

function parseArgs(argv) {
  const args = { json: false, width: undefined, height: undefined, inputPath: undefined };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--width') {
      args.width = Number(argv[++i]);
    } else if (arg === '--height') {
      args.height = Number(argv[++i]);
    } else if (!args.inputPath) {
      args.inputPath = arg;
    }
  }

  return args;
}

function main(argv) {
  const { json, width, height, inputPath } = parseArgs(argv);

  if (!inputPath) {
    process.stderr.write('usage: covertown <coverage-file> [--json] [--width N] [--height N]\n');
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

  if (json) {
    process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
    return;
  }

  const layoutWidth = Number.isInteger(width) && width > 0 ? width : process.stdout.columns || 80;
  const layoutHeight = Number.isInteger(height) && height > 0 ? height : (process.stdout.rows || 24) - 1;

  const layout = buildLayout(model.tree, { width: layoutWidth, height: layoutHeight });
  process.stdout.write(`${renderFrame(layout)}\n`);
}

main(process.argv);
