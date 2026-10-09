import type { Point } from '../robots/types';
import { distance, segmentFree, type PlanningGrid, type PlanResult } from './grid';

const STEP = 0.3; // m per descent step
const K_ATTRACT = 1.0;
const K_REPEL = 1.5;
const INFLUENCE = 2.5; // m; obstacles further than this exert no force
const MAX_STEPS = 3000;
const PROGRESS_WINDOW = 25; // steps
const MAX_ESCAPES = 6;
const ESCAPE_STEPS = 20;

/**
 * Artificial Potential Field. The goal attracts the robot and nearby obstacles repel it;
 * the robot follows the resulting force. When it stops making progress (a local minimum)
 * it tries a short random walk to escape, and gives up after a few attempts.
 */
export function potentialField(grid: PlanningGrid, start: Point, goal: Point, random: () => number): PlanResult {
  let p: Point = { ...start };
  const path: Point[] = [{ ...start }];
  const history: number[] = [];
  let escapes = 0;
  let steps = 0;

  const tryMove = (dirX: number, dirY: number): boolean => {
    const baseAngle = Math.atan2(dirY, dirX);
    // Try the desired heading first, then deflect progressively around obstacles.
    for (const offset of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2]) {
      const a = baseAngle + offset;
      const next = { x: p.x + Math.cos(a) * STEP, y: p.y + Math.sin(a) * STEP };
      if (segmentFree(grid, p, next)) {
        p = next;
        path.push({ ...p });
        return true;
      }
    }
    return false;
  };

  while (steps < MAX_STEPS) {
    steps++;
    const toGoal = distance(p, goal);
    if (toGoal < 0.45) {
      path.push({ ...goal });
      return { success: true, path: downsample(path), nodesExpanded: steps };
    }

    // Conic attractive force, capped so distant goals don't swamp repulsion.
    const attract = K_ATTRACT * Math.min(toGoal, 3);
    let fx = ((goal.x - p.x) / toGoal) * attract;
    let fy = ((goal.y - p.y) / toGoal) * attract;

    // Repulsion from obstacle cells, damped near the goal so it stays reachable.
    const goalDamping = Math.min(1, (toGoal / INFLUENCE) ** 2);
    const r = Math.ceil(INFLUENCE) + 1;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!grid.blocked.has(`${x},${y}`)) continue;
        const centre = Math.hypot(p.x - x, p.y - y);
        const d = Math.max(centre - 0.5, 0.05);
        if (d >= INFLUENCE || centre === 0) continue;
        const magnitude = K_REPEL * (1 / d - 1 / INFLUENCE) / (d * d) * goalDamping;
        fx += ((p.x - x) / centre) * magnitude;
        fy += ((p.y - y) / centre) * magnitude;
      }
    }

    const moved = Math.hypot(fx, fy) > 1e-6 && tryMove(fx, fy);

    history.push(toGoal);
    const stalled =
      !moved || (history.length > PROGRESS_WINDOW && history[history.length - 1 - PROGRESS_WINDOW] - toGoal < 0.3);
    if (stalled) {
      if (escapes >= MAX_ESCAPES) {
        return {
          success: false,
          path: [],
          nodesExpanded: steps,
          message: `Trapped in a local minimum ${toGoal.toFixed(1)} m from the goal after ${MAX_ESCAPES} escape attempts`,
        };
      }
      // Escape: walk in one random direction (sliding along obstacles) before resuming descent.
      escapes++;
      history.length = 0;
      const a = random() * Math.PI * 2;
      for (let i = 0; i < ESCAPE_STEPS; i++) {
        tryMove(Math.cos(a), Math.sin(a));
        steps++;
      }
    }
  }

  return { success: false, path: [], nodesExpanded: steps, message: `Did not converge within ${MAX_STEPS} steps` };
}

/** Cuts out loops left by escape walks: when the path comes back near an earlier point, skip the detour. */
function pruneLoops(path: Point[]): Point[] {
  const out: Point[] = [];
  let i = 0;
  while (i < path.length) {
    out.push(path[i]);
    let next = i + 1;
    for (let j = path.length - 1; j > i + 3; j--) {
      if (distance(path[i], path[j]) < 0.35) {
        next = j + 1;
        break;
      }
    }
    i = next;
  }
  return out;
}

function downsample(path: Point[]): Point[] {
  return pruneLoops(path).filter((_, i, arr) => i % 2 === 0 || i === arr.length - 1);
}
