import type { Point } from '../robots/types';
import { distance, segmentFree, type PlanningGrid, type PlanResult } from './grid';

const STEP = 0.9; // m per tree extension
const GOAL_BIAS = 0.1; // probability of sampling the goal directly
const GOAL_TOLERANCE = 1.2; // m; connect straight to goal when this close and visible
const MAX_ITERATIONS = 6000;

/**
 * Rapidly-exploring Random Tree. Samples random points in continuous space, grows the
 * tree toward each sample by a fixed step, and stops once the goal is reachable.
 * Paths are feasible but not optimal, which is visible in the analytics comparison.
 */
export function rrt(grid: PlanningGrid, start: Point, goal: Point, random: () => number): PlanResult {
  const nodes: { p: Point; parent: number }[] = [{ p: start, parent: -1 }];

  const buildPath = (lastIndex: number): Point[] => {
    const path: Point[] = [goal];
    let i = lastIndex;
    while (i !== -1) {
      path.push(nodes[i].p);
      i = nodes[i].parent;
    }
    return path.reverse();
  };

  if (distance(start, goal) <= GOAL_TOLERANCE && segmentFree(grid, start, goal)) {
    return { success: true, path: [start, goal], nodesExpanded: 1 };
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const sample: Point =
      random() < GOAL_BIAS
        ? goal
        : { x: random() * (grid.width - 1), y: random() * (grid.height - 1) };

    let nearest = 0;
    let nearestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = distance(nodes[i].p, sample);
      if (d < nearestD) {
        nearestD = d;
        nearest = i;
      }
    }

    const from = nodes[nearest].p;
    const t = nearestD <= STEP ? 1 : STEP / nearestD;
    const next: Point = { x: from.x + (sample.x - from.x) * t, y: from.y + (sample.y - from.y) * t };
    if (!segmentFree(grid, from, next)) continue;

    nodes.push({ p: next, parent: nearest });
    if (distance(next, goal) <= GOAL_TOLERANCE && segmentFree(grid, next, goal)) {
      return { success: true, path: buildPath(nodes.length - 1), nodesExpanded: nodes.length };
    }
  }

  return {
    success: false,
    path: [],
    nodesExpanded: nodes.length,
    message: `Tree did not reach the goal within ${MAX_ITERATIONS} iterations`,
  };
}
