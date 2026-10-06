import type { Point } from '../robots/types';

/** Occupancy grid. Cell (x, y) is centred on integer coordinates and spans ±0.5 m. */
export interface PlanningGrid {
  width: number;
  height: number;
  blocked: Set<string>;
}

export interface PlanResult {
  success: boolean;
  path: Point[];
  nodesExpanded: number;
  message?: string;
}

export function makeGrid(width: number, height: number, obstacles: Point[]): PlanningGrid {
  return { width, height, blocked: new Set(obstacles.map(p => `${p.x},${p.y}`)) };
}

export function isCellFree(grid: PlanningGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height && !grid.blocked.has(`${x},${y}`);
}

export function isPointFree(grid: PlanningGrid, p: Point): boolean {
  return isCellFree(grid, Math.round(p.x), Math.round(p.y));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Checks a straight segment for collisions by sampling every 0.1 m. */
export function segmentFree(grid: PlanningGrid, a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isPointFree(grid, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

export function pathLength(path: Point[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += distance(path[i - 1], path[i]);
  return len;
}

/** Distance from a point to the nearest obstacle cell edge, capped at `cap`. */
export function clearanceAt(grid: PlanningGrid, p: Point, cap = 3): number {
  let best = cap;
  const r = Math.ceil(cap) + 1;
  const cx = Math.round(p.x);
  const cy = Math.round(p.y);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!grid.blocked.has(`${x},${y}`)) continue;
      const dx = Math.max(Math.abs(p.x - x) - 0.5, 0);
      const dy = Math.max(Math.abs(p.y - y) - 0.5, 0);
      best = Math.min(best, Math.hypot(dx, dy));
    }
  }
  return best;
}
