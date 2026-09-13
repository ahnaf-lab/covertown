#!/usr/bin/env node
// Reads a local coverage report and either draws it as a single static
// ANSI-coloured frame, or — when run interactively at a real terminal —
// walks it: arrow keys move between buildings, enter drills into a
// directory as its own district, backspace steps back out.
import { readFileSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { parseCoverage } from '../src/index.js';
import { buildLayout } from '../src/layout.js';
import { renderFrame } from '../src/render.js';
import { createNavState, handleKey, getSelectedNode, getBreadcrumb } from '../src/navigate.js';

const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const RESET = '\x1b[0m';

function parseArgs(argv) {
  const args = { json: false, static: false, width: undefined, height: undefined, inputPath: undefined };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--static') {
      args.static = true;
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

// Maps a Node `readline` keypress to the vocabulary `navigate.js` understands.
// Everything else (letters, digits, unmapped control keys) is ignored.
function toNavKey(key) {
  if (!key) return null;
  switch (key.name) {
    case 'left':
    case 'right':
    case 'up':
    case 'down':
      return key.name;
    case 'return':
      return 'enter';
    case 'backspace':
    case 'escape':
      return 'back';
    default:
      return null;
  }
}

function isQuit(key) {
  return Boolean(key) && (key.name === 'q' || (key.ctrl && key.name === 'c'));
}

function draw(layout, state) {
  const selected = getSelectedNode(layout, state);
  const highlight = selected ? { x: selected.x, y: selected.y, width: selected.width, height: selected.height } : undefined;

  const lines = [];
  lines.push(getBreadcrumb(layout, state).join('/'));
  lines.push(renderFrame(layout, { highlight }));
  lines.push(
    selected
      ? `${selected.path} — ${selected.loc} lines, ${selected.coveragePct}% covered`
      : 'nothing here',
  );
  lines.push('arrows move, enter drills in, backspace steps out, q quits');

  process.stdout.write(CLEAR_SCREEN + lines.join('\n') + '\n');
}

// Runs the walkable city until the user quits. Only called when stdin/stdout
// are both real terminals, so raw mode is always available here.
function runInteractive(layout) {
  let state = createNavState(layout);

  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  draw(layout, state);

  process.stdin.on('keypress', (_str, key) => {
    if (isQuit(key)) {
      process.stdin.setRawMode(false);
      process.stdout.write(`${RESET}\n`);
      process.exit(0);
      return;
    }

    const navKey = toNavKey(key);
    if (!navKey) return;

    state = handleKey(layout, state, navKey);
    draw(layout, state);
  });
}

function main(argv) {
  const { json, static: staticMode, width, height, inputPath } = parseArgs(argv);

  if (!inputPath) {
    process.stderr.write('usage: covertown <coverage-file> [--json] [--static] [--width N] [--height N]\n');
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

  if (!staticMode && process.stdin.isTTY && process.stdout.isTTY) {
    runInteractive(layout);
    return;
  }

  process.stdout.write(`${renderFrame(layout)}\n`);
}

main(process.argv);
