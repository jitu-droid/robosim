import { Building2, Grid3x3, Shapes, Square, Warehouse } from 'lucide-react';
import type { JobInput } from '@/lib/robomaker/store';
import type { Algorithm, SimulationWorld, WorldTemplateId } from '@/lib/robomaker/types';
import { defaultStartGoal } from '@/lib/robomaker/worlds';

export const ALGORITHMS: Algorithm[] = ['astar', 'rrt', 'potentialField'];

export const TEMPLATE_ICONS: Record<WorldTemplateId, typeof Square> = {
  empty: Square,
  warehouse: Warehouse,
  maze: Grid3x3,
  office: Building2,
  clutter: Shapes,
};

/** Job inputs that run every planner on the same world, start and goal. */
export function benchmarkInputs(
  robotAppId: string,
  world: SimulationWorld,
  base: Partial<JobInput> & { name?: string } = {}
): JobInput[] {
  const sg = defaultStartGoal(world);
  return ALGORITHMS.map(algorithm => ({
    robotAppId,
    worldId: world.id,
    start: base.start ?? sg.start,
    goal: base.goal ?? sg.goal,
    maxJobDurationInSeconds: base.maxJobDurationInSeconds ?? 120,
    failureBehavior: base.failureBehavior ?? 'Fail',
    realTimeFactor: base.realTimeFactor ?? 2,
    tags: base.tags ?? { purpose: 'benchmark' },
    algorithm,
    name: `${base.name || 'benchmark'}-${algorithm}`,
  }));
}
