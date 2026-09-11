// Parses Istanbul-style JSON coverage into { [filePath]: { loc, covered } }.
//
// Two shapes are accepted, since both are common output of real tools:
//
//   raw (coverage-final.json): { [path]: { statementMap, s, ... } }
//     `statementMap` lists every instrumented statement; `s` maps each
//     statement id to its hit count. Statement count is used as the loc
//     proxy since Istanbul does not otherwise expose a line count.
//
//   summary (coverage-summary.json): { [path]: { lines: { total, covered } } }
//     already aggregated per file; used directly.
//
// A top-level "total" key (present in the summary shape) is an aggregate
// row, not a file, and is skipped.
export function parseIstanbulJson(json) {
  const files = {};

  for (const [path, data] of Object.entries(json)) {
    if (path === 'total' || !data || typeof data !== 'object') continue;

    if (data.lines && typeof data.lines.total === 'number') {
      files[path] = {
        loc: data.lines.total,
        covered: data.lines.covered || 0,
      };
    } else if (data.statementMap && data.s) {
      const ids = Object.keys(data.statementMap);
      let covered = 0;
      for (const id of ids) {
        if ((data.s[id] || 0) > 0) covered += 1;
      }
      files[path] = { loc: ids.length, covered };
    }
  }

  return files;
}
