// Builds a directory tree out of a flat { [filePath]: { loc, covered } }
// map, aggregating loc/coverage at every directory level so a directory's
// size and colour can be derived the same way a file's can.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pct(loc, covered) {
  return loc > 0 ? round2((covered / loc) * 100) : 0;
}

function makeRawNode(name, path, type) {
  return {
    name,
    path,
    type,
    loc: 0,
    covered: 0,
    children: type === 'dir' ? new Map() : null,
  };
}

// Returns a node carrying an internal `covered` (exact hit count) alongside
// the public `coveragePct`, so aggregation up the tree sums exact counts
// instead of compounding rounding error from an already-rounded percentage.
function finalize(node) {
  if (node.type === 'file') {
    return {
      name: node.name,
      path: node.path,
      type: 'file',
      loc: node.loc,
      covered: node.covered,
      coveragePct: pct(node.loc, node.covered),
    };
  }

  const children = [...node.children.values()]
    .map(finalize)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  let loc = 0;
  let covered = 0;
  for (const child of children) {
    loc += child.loc;
    covered += child.covered;
  }

  return {
    name: node.name,
    path: node.path,
    type: 'dir',
    loc,
    covered,
    coveragePct: pct(loc, covered),
    children,
  };
}

// Strips the internal `covered` field before the tree is handed to callers,
// keeping the public shape to {name, path, type, loc, coveragePct, children}.
function stripInternal(node) {
  const { covered, children, ...rest } = node;
  if (!children) return rest;
  return { ...rest, children: children.map(stripInternal) };
}

export function buildTree(filesRaw) {
  const root = makeRawNode('.', '.', 'dir');

  for (const [filePath, data] of Object.entries(filesRaw)) {
    const parts = filePath.split('/').filter(Boolean);
    let node = root;
    let acc = '';

    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = makeRawNode(part, acc, isFile ? 'file' : 'dir');
        node.children.set(part, child);
      }
      node = child;
    });

    node.loc = data.loc;
    node.covered = data.covered;
  }

  return stripInternal(finalize(root));
}
