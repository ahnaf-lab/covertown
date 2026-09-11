// Parses the lcov text format into { [filePath]: { loc, covered } }.
//
// Reference fields used:
//   SF:<path>           start of a file record
//   LF:<n>               lines found (instrumented lines) for that file
//   LH:<n>               lines hit
//   DA:<line>,<hits>     per-line hit count, used as a fallback when a
//                         record has no LF/LH summary lines
//   end_of_record        closes the current file record
//
// Some lcov producers omit LF/LH but always emit DA lines, so DA counts are
// kept as a fallback rather than assumed to always be redundant.
export function parseLcov(content) {
  const files = {};
  let current = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('SF:')) {
      const path = line.slice(3).trim();
      current = files[path] || { loc: 0, covered: 0, daTotal: 0, daHit: 0 };
      files[path] = current;
    } else if (line.startsWith('LF:') && current) {
      current.loc = parseInt(line.slice(3), 10) || current.loc;
    } else if (line.startsWith('LH:') && current) {
      current.covered = parseInt(line.slice(3), 10) || current.covered;
    } else if (line.startsWith('DA:') && current) {
      const hits = parseInt(line.slice(3).split(',')[1], 10) || 0;
      current.daTotal += 1;
      if (hits > 0) current.daHit += 1;
    } else if (line === 'end_of_record') {
      current = null;
    }
  }

  for (const data of Object.values(files)) {
    if (data.loc === 0 && data.daTotal > 0) {
      data.loc = data.daTotal;
      data.covered = data.daHit;
    }
    delete data.daTotal;
    delete data.daHit;
  }

  return files;
}
