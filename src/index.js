// Turns raw coverage report text into the model the rest of the app
// consumes: a flat per-file { loc, coveragePct } map, plus the same data
// arranged into a walkable directory tree.
import { parseLcov } from './parseLcov.js';
import { parseIstanbulJson } from './parseIstanbul.js';
import { buildTree } from './tree.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

// lcov is a line-oriented text format, not JSON, so a failed JSON.parse is
// the cheapest reliable signal that the input is lcov rather than Istanbul.
function parseRaw(content) {
  let json;
  try {
    json = JSON.parse(content);
  } catch {
    return parseLcov(content);
  }
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('unrecognised coverage format: expected an lcov file or a JSON object');
  }
  return parseIstanbulJson(json);
}

export function parseCoverage(content) {
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('empty coverage input');
  }

  const filesRaw = parseRaw(content);

  if (Object.keys(filesRaw).length === 0) {
    throw new Error('no file records found in coverage input');
  }

  const files = {};
  for (const [path, { loc, covered }] of Object.entries(filesRaw)) {
    files[path] = { loc, coveragePct: round2(loc > 0 ? (covered / loc) * 100 : 0) };
  }

  return { files, tree: buildTree(filesRaw) };
}
