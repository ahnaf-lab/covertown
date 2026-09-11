// Packs a coverage tree (as produced by buildTree) into a deterministic,
// treemap-style grid: every node — directory and file alike — gets an
// integer {x, y, width, height} footprint, sized by lines of code, with each
// directory's children packed entirely inside that directory's own rectangle
// so the city stays grouped by folder.
//
// This only computes the layout, not how it is drawn — the walkable
// rendering lands in a later milestone.

// Splits `total` integer units among `weights` proportionally, using the
// largest-remainder method so the parts always sum to exactly `total` (plain
// rounding can drift by a unit and leave gaps or overlaps between siblings).
// Ties in the remainder go to the earlier index, keeping the result
// deterministic for a given input.
function distribute(weights, total) {
  const n = weights.length;
  if (n === 0) return [];

  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (sumWeights > 0 ? (w / sumWeights) * total : total / n));
  const sizes = raw.map(Math.floor);
  let remainder = total - sizes.reduce((a, b) => a + b, 0);

  const byFraction = raw
    .map((r, i) => ({ frac: r - Math.floor(r), i }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; k < remainder; k++) {
    sizes[byFraction[k % n].i] += 1;
  }

  // Guarantee every part is visible (>=1) whenever there is room for it, by
  // borrowing single units from the currently-largest part. This keeps the
  // sum unchanged, so parent and children footprints still match exactly.
  if (total >= n) {
    for (let i = 0; i < n; i++) {
      if (sizes[i] > 0) continue;
      let donor = 0;
      for (let j = 1; j < n; j++) {
        if (sizes[j] > sizes[donor]) donor = j;
      }
      if (sizes[donor] > 1) {
        sizes[donor] -= 1;
        sizes[i] = 1;
      }
    }
  }

  return sizes;
}

// A node with zero (or unmeasured) lines still occupies space in the city —
// an empty file is a building, not a hole — so every node is weighted by at
// least 1.
function weightOf(node) {
  return Math.max(node.loc, 1);
}

function packNode(node, x, y, width, height) {
  const rect = { x, y, width, height };

  if (node.type === 'file') {
    return { ...node, ...rect };
  }

  const children = node.children ?? [];
  if (children.length === 0) {
    return { ...node, ...rect, children: [] };
  }

  // Slice along whichever axis is currently longer, keeping each generation
  // of buildings closer to square than a fixed alternating split would.
  const vertical = width >= height;
  const weights = children.map(weightOf);
  const sizes = distribute(weights, vertical ? width : height);

  let offset = 0;
  const packedChildren = children.map((child, i) => {
    const size = sizes[i];
    const packed = vertical
      ? packNode(child, x + offset, y, size, height)
      : packNode(child, x, y + offset, width, size);
    offset += size;
    return packed;
  });

  return { ...node, ...rect, children: packedChildren };
}

export function buildLayout(tree, { width = 80, height = 24 } = {}) {
  if (!Number.isInteger(width) || width < 1) {
    throw new Error('layout width must be a positive integer');
  }
  if (!Number.isInteger(height) || height < 1) {
    throw new Error('layout height must be a positive integer');
  }

  return packNode(tree, 0, 0, width, height);
}
