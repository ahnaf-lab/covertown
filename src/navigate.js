// Pure navigation state machine over a laid-out coverage tree (see layout.js).
// Nothing here touches the terminal — it only turns a `{path, selectedIndex}`
// state plus a key name into the next state, so the walking logic can be
// tested without a real TTY. `bin/covertown.js` is the only place that reads
// actual keypresses and calls into this module.
//
// `path` is the list of directory names drilled into so far, root-first
// (`[]` means "standing at the root district"). `selectedIndex` indexes into
// the children of whichever node `path` currently points at — the buildings
// and sub-districts visible in the current district.

// Walks `path` from `layout` (the root node), stopping early — rather than
// throwing — if a segment no longer exists, so a stale state never crashes.
function resolveNode(layout, path) {
  let node = layout;
  for (const name of path) {
    const next = (node.children ?? []).find((child) => child.name === name);
    if (!next) return node;
    node = next;
  }
  return node;
}

function getChildren(layout, path) {
  return resolveNode(layout, path).children ?? [];
}

// Only a non-empty directory is a "district" you can walk into — a file has
// nothing inside it, and an empty directory is drawn as its own building
// (see render.js) precisely because there is nothing to drill into.
function canDrillInto(node) {
  return node.type === 'dir' && (node.children ?? []).length > 0;
}

function center(node) {
  return { cx: node.x + node.width / 2, cy: node.y + node.height / 2 };
}

// Coordinates are absolute (rooted at 0,0 regardless of how deep `path` is),
// so comparing centres works the same at any depth.
const DIRECTION_TESTS = {
  left: (from, to) => to.cx < from.cx,
  right: (from, to) => to.cx > from.cx,
  up: (from, to) => to.cy < from.cy,
  down: (from, to) => to.cy > from.cy,
};

// Finds the closest sibling in the given compass direction from the current
// selection, by straight-line distance between rectangle centres. Returns
// the current index unchanged if nothing lies that way.
function findNeighborIndex(children, currentIndex, direction) {
  const current = children[currentIndex];
  if (!current) return currentIndex;

  const from = center(current);
  const isInDirection = DIRECTION_TESTS[direction];

  let bestIndex = currentIndex;
  let bestDistance = Infinity;

  children.forEach((child, index) => {
    if (index === currentIndex) return;
    const to = center(child);
    if (!isInDirection(from, to)) return;

    const distance = Math.hypot(to.cx - from.cx, to.cy - from.cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

// Starts standing in the root district, with the first child selected (or no
// selection at all if the report is a single file with nothing to walk).
export function createNavState(layout) {
  const children = getChildren(layout, []);
  return { path: [], selectedIndex: children.length > 0 ? 0 : -1 };
}

// Advances `state` by one key. Recognised keys: 'left' | 'right' | 'up' |
// 'down' (move the selection within the current district), 'enter' (drill
// into the selected directory), 'back' (step out to the parent district).
// Anything else, or a move/drill/back that has nowhere to go, returns the
// same state unchanged.
export function handleKey(layout, state, key) {
  if (key in DIRECTION_TESTS) {
    const children = getChildren(layout, state.path);
    if (children.length === 0) return state;
    const nextIndex = findNeighborIndex(children, state.selectedIndex, key);
    if (nextIndex === state.selectedIndex) return state;
    return { ...state, selectedIndex: nextIndex };
  }

  if (key === 'enter') {
    const children = getChildren(layout, state.path);
    const selected = children[state.selectedIndex];
    if (!canDrillInto(selected)) return state;

    const nextPath = [...state.path, selected.name];
    const nextChildren = getChildren(layout, nextPath);
    return { path: nextPath, selectedIndex: nextChildren.length > 0 ? 0 : -1 };
  }

  if (key === 'back') {
    if (state.path.length === 0) return state;

    const leavingName = state.path[state.path.length - 1];
    const parentPath = state.path.slice(0, -1);
    const siblings = getChildren(layout, parentPath);
    const restoredIndex = siblings.findIndex((child) => child.name === leavingName);

    return { path: parentPath, selectedIndex: restoredIndex === -1 ? 0 : restoredIndex };
  }

  return state;
}

// The district currently being stood in (its rectangle is the visible
// viewport's worth of children — not itself painted, per render.js).
export function getCurrentNode(layout, state) {
  return resolveNode(layout, state.path);
}

// The building or district under the cursor right now, or null if the
// current district has nothing in it to select.
export function getSelectedNode(layout, state) {
  const children = getChildren(layout, state.path);
  return children[state.selectedIndex] ?? null;
}

// Root-first list of names from the report root down to the current
// district, e.g. `['.', 'src', 'nested']`, for display as a location trail.
export function getBreadcrumb(layout, state) {
  return [layout.name, ...state.path];
}
