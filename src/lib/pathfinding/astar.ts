import type { Point } from '../robots/types';
import { isCellFree, type PlanningGrid, type PlanResult } from './grid';

const SQRT2 = Math.SQRT2;

/** Octile distance: admissible for 8-connected grids. */
function heuristic(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

/** Minimal binary heap keyed on f-score. */
class MinHeap {
  private items: { key: number; f: number }[] = [];

  get size() {
    return this.items.length;
  }

  push(key: number, f: number) {
    const items = this.items;
    items.push({ key, f });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].f <= items[i].f) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): number {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l].f < items[m].f) m = l;
        if (r < items.length && items[r].f < items[m].f) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top.key;
  }
}

const DIRECTIONS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/**
 * A* search on an 8-connected occupancy grid. Diagonal moves are only allowed when
 * both adjacent orthogonal cells are free, so the robot never cuts an obstacle corner.
 */
export function astar(grid: PlanningGrid, start: Point, goal: Point): PlanResult {
  const { width } = grid;
  const key = (x: number, y: number) => y * width + x;

  if (!isCellFree(grid, start.x, start.y) || !isCellFree(grid, goal.x, goal.y)) {
    return { success: false, path: [], nodesExpanded: 0, message: 'Start or goal lies inside an obstacle' };
  }

  const g = new Map<number, number>();
  const parent = new Map<number, number>();
  const closed = new Set<number>();
  const open = new MinHeap();
  const startKey = key(start.x, start.y);
  const goalKey = key(goal.x, goal.y);

  g.set(startKey, 0);
  open.push(startKey, heuristic(start, goal));
  let expanded = 0;

  while (open.size) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    expanded++;

    if (current === goalKey) {
      const path: Point[] = [];
      let k: number | undefined = current;
      while (k !== undefined) {
        path.push({ x: k % width, y: Math.floor(k / width) });
        k = parent.get(k);
      }
      return { success: true, path: path.reverse(), nodesExpanded: expanded };
    }

    const cx = current % width;
    const cy = Math.floor(current / width);
    for (const [dx, dy, cost] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isCellFree(grid, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!isCellFree(grid, cx + dx, cy) || !isCellFree(grid, cx, cy + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const tentative = g.get(current)! + cost;
      if (tentative < (g.get(nk) ?? Infinity)) {
        g.set(nk, tentative);
        parent.set(nk, current);
        open.push(nk, tentative + heuristic({ x: nx, y: ny }, goal));
      }
    }
  }

  return { success: false, path: [], nodesExpanded: expanded, message: 'No collision-free path exists between start and goal' };
}
