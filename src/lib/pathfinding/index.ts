import type { Algorithm } from '@/lib/robomaker/types';
import type { Point } from '../robots/types';
import { astar } from './astar';
import type { PlanningGrid, PlanResult } from './grid';
import { potentialField } from './potential-field';
import { rrt } from './rrt';

export * from './grid';
export { astar, potentialField, rrt };

export function planPath(
  algorithm: Algorithm,
  grid: PlanningGrid,
  start: Point,
  goal: Point,
  random: () => number
): PlanResult & { planningMs: number } {
  const t0 = performance.now();
  let result: PlanResult;
  switch (algorithm) {
    case 'rrt':
      result = rrt(grid, start, goal, random);
      break;
    case 'potentialField':
      result = potentialField(grid, start, goal, random);
      break;
    default:
      result = astar(grid, start, goal);
  }
  return { ...result, planningMs: performance.now() - t0 };
}
