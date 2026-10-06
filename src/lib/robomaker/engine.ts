import { astar, clearanceAt, distance, makeGrid, pathLength, planPath } from '@/lib/pathfinding';
import { arn, hashString, seededRandom } from './ids';
import { distanceAt, poseAlongPath, profileDuration, speedAt, type Pose } from './motion';
import { generateLayout, WORLD_TEMPLATES } from './worlds';
import {
  ACTIVE_STATUSES,
  ALGORITHM_LABELS,
  type JobMetrics,
  type LogLevel,
  type RoboMakerState,
  type RobotType,
  type SimulationJob,
  type SimulationWorld,
  type WorldGenerationJob,
} from './types';

/** How many simulation jobs may be active at once across the account (RoboMaker had a similar quota). */
export const ACCOUNT_CONCURRENCY_LIMIT = 5;
const PREP_STAGE_MS = [0, 800, 1600];
const PREP_MS = 2400;
const TERMINATE_MS = 1200;
const WORLD_GEN_MS_PER_WORLD = 700;
const POSE_LOG_INTERVAL_S = 2;
const MAX_LOGS = 300;

const ENERGY_PER_METRE: Record<RobotType, number> = { mobile: 12, arm: 6, hybrid: 20 };
const ENERGY_PER_TURN: Record<RobotType, number> = { mobile: 4, arm: 2, hybrid: 7 };
const IDLE_POWER_W = 2;

function withLog(job: SimulationJob, t: number, level: LogLevel, message: string): SimulationJob {
  const logs = [...job.logs, { t, level, message }];
  return { ...job, logs: logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs };
}

/** Simulated seconds elapsed since the job entered Running. */
export function jobSimSeconds(job: SimulationJob, now: number): number {
  if (!job.runningAt) return 0;
  const end = job.status === 'Running' || job.status === 'RunningFailed' ? now : job.endedAt ?? job.terminatingAt ?? now;
  return Math.max(0, ((end - job.runningAt) / 1000) * job.realTimeFactor);
}

/** Robot pose at a given simulated time, following the job's planned path and motion profile. */
export function jobPoseAt(job: SimulationJob, simSeconds: number): Pose & { speed: number; travelled: number } {
  const path = job.path ?? [job.start];
  const L = job.metrics?.pathLength ?? 0;
  const s = distanceAt(simSeconds, L, job.maxSpeed, job.maxAcceleration);
  const pose = poseAlongPath(path, s);
  return { ...pose, speed: speedAt(simSeconds, L, job.maxSpeed, job.maxAcceleration), travelled: s };
}

/** Fraction of the planned route covered so far (0–1). */
export function jobProgress(job: SimulationJob, now: number): number {
  if (job.status === 'Completed' && job.goalReached) return 1;
  if (!job.metrics || !job.runningAt) return 0;
  const sim = Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds);
  return job.metrics.simDuration === 0 ? 1 : Math.min(1, sim / job.metrics.simDuration);
}

function countTurns(path: { x: number; y: number }[]): number {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const h1 = Math.atan2(path[i - 1].y - path[i - 2].y, path[i - 1].x - path[i - 2].x);
    const h2 = Math.atan2(path[i].y - path[i - 1].y, path[i].x - path[i - 1].x);
    let d = Math.abs(h2 - h1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > (20 * Math.PI) / 180) turns++;
  }
  return turns;
}

function computeMetrics(
  job: SimulationJob,
  world: SimulationWorld,
  plan: { path: { x: number; y: number }[]; nodesExpanded: number; planningMs: number }
): JobMetrics {
  const grid = makeGrid(world.width, world.height, world.obstacles);
  const length = pathLength(plan.path);
  const reference = job.algorithm === 'astar' ? { success: true, path: plan.path } : astar(grid, job.start, job.goal);
  const optimalLength = reference.success ? pathLength(reference.path) : null;
  const simDuration = profileDuration(length, job.maxSpeed, job.maxAcceleration);
  const turns = countTurns(plan.path);

  let minClearance = 3;
  for (let s = 0; s <= length; s += 0.25) {
    minClearance = Math.min(minClearance, clearanceAt(grid, poseAlongPath(plan.path, s)));
  }

  return {
    pathLength: length,
    straightLine: distance(job.start, job.goal),
    optimalLength,
    optimality: optimalLength && length > 0 ? Math.min(100, (optimalLength / length) * 100) : null,
    planningMs: plan.planningMs,
    nodesExpanded: plan.nodesExpanded,
    simDuration,
    energy: length * ENERGY_PER_METRE[job.robotType] + turns * ENERGY_PER_TURN[job.robotType] + simDuration * IDLE_POWER_W,
    turns,
    minClearance,
  };
}

function prepMessages(job: SimulationJob): string[] {
  return [
    `Downloading robot application bundle ${job.robotAppName}:${job.robotAppVersion} (${job.robotType})`,
    `Launching simulation application with world "${job.worldName}" (${job.simulationUnits} SU allocated)`,
    `Starting ${ALGORITHM_LABELS[job.algorithm]} path planner, start=(${job.start.x}, ${job.start.y}) goal=(${job.goal.x}, ${job.goal.y})`,
  ];
}

function advancePreparing(job: SimulationJob, worlds: SimulationWorld[], now: number): SimulationJob {
  let next = job;
  const elapsed = now - (job.preparingAt ?? now);
  const messages = prepMessages(job);
  let stage = job.prepStage ?? 0;
  while (stage < PREP_STAGE_MS.length && elapsed >= PREP_STAGE_MS[stage]) {
    next = withLog(next, (job.preparingAt ?? now) + PREP_STAGE_MS[stage], 'INFO', messages[stage]);
    stage++;
  }
  if (stage !== (job.prepStage ?? 0)) next = { ...next, prepStage: stage };
  if (elapsed < PREP_MS) return next;

  const world = worlds.find(w => w.id === job.worldId);
  if (!world) {
    next = withLog(next, now, 'ERROR', `World ${job.worldId} no longer exists`);
    return { ...next, status: 'Failed', endedAt: now, failureCode: 'SimulationApplicationCrash', failureReason: 'The simulation world was deleted before the job started.' };
  }

  const grid = makeGrid(world.width, world.height, world.obstacles);
  const plan = planPath(job.algorithm, grid, job.start, job.goal, seededRandom(hashString(job.id)));

  if (!plan.success) {
    next = withLog(next, now, 'ERROR', `${ALGORITHM_LABELS[job.algorithm]} planner failed after ${plan.nodesExpanded} nodes: ${plan.message}`);
    const failure = {
      failureCode: 'RobotApplicationCrash',
      failureReason: `Path planning failed: ${plan.message}`,
      metrics: undefined,
    };
    if (job.failureBehavior === 'Continue') {
      next = withLog(next, now, 'WARN', 'failureBehavior=Continue — keeping the simulation running until maxJobDurationInSeconds or cancellation');
      return { ...next, ...failure, status: 'RunningFailed', runningAt: now };
    }
    return { ...next, ...failure, status: 'Failed', endedAt: now };
  }

  const metrics = computeMetrics(job, world, plan);
  next = withLog(
    next,
    now,
    'INFO',
    `Path found: ${metrics.pathLength.toFixed(2)} m, ${plan.path.length} waypoints, ${plan.nodesExpanded} nodes expanded in ${plan.planningMs.toFixed(2)} ms`
  );
  next = withLog(next, now, 'INFO', `Robot application started — executing trajectory (ETA ${metrics.simDuration.toFixed(1)} s simulated, RTF ${job.realTimeFactor}×)`);
  return { ...next, status: 'Running', runningAt: now, path: plan.path, metrics, lastPoseLogSecond: 0 };
}

function advanceRunning(job: SimulationJob, now: number): SimulationJob {
  const metrics = job.metrics!;
  const sim = jobSimSeconds(job, now);
  let next = job;

  let last = job.lastPoseLogSecond ?? 0;
  while (last + POSE_LOG_INTERVAL_S < Math.min(sim, metrics.simDuration, job.maxJobDurationInSeconds)) {
    last += POSE_LOG_INTERVAL_S;
    const pose = jobPoseAt(job, last);
    const at = (job.runningAt ?? now) + (last / job.realTimeFactor) * 1000;
    next = withLog(
      next,
      at,
      'INFO',
      `t=${last.toFixed(0)}s pose=(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}) heading=${((pose.heading * 180) / Math.PI).toFixed(0)}° v=${pose.speed.toFixed(2)} m/s remaining=${(metrics.pathLength - pose.travelled).toFixed(2)} m`
    );
  }
  if (last !== job.lastPoseLogSecond) next = { ...next, lastPoseLogSecond: last };

  if (sim >= metrics.simDuration && metrics.simDuration <= job.maxJobDurationInSeconds) {
    const end = (job.runningAt ?? now) + (metrics.simDuration / job.realTimeFactor) * 1000;
    next = withLog(next, end, 'INFO', `Goal reached in ${metrics.simDuration.toFixed(2)} s, energy used ${metrics.energy.toFixed(1)} J`);
    next = withLog(next, end, 'INFO', `Uploading result.json, trajectory.csv and logs to S3 output location`);
    return { ...next, status: 'Completed', goalReached: true, endedAt: end };
  }
  if (sim >= job.maxJobDurationInSeconds) {
    const end = (job.runningAt ?? now) + (job.maxJobDurationInSeconds / job.realTimeFactor) * 1000;
    next = withLog(next, end, 'WARN', `maxJobDurationInSeconds (${job.maxJobDurationInSeconds}s) reached before the goal — stopping simulation`);
    return { ...next, status: 'Completed', goalReached: false, endedAt: end };
  }
  return next;
}

function advanceRunningFailed(job: SimulationJob, now: number): SimulationJob {
  if (jobSimSeconds(job, now) < job.maxJobDurationInSeconds) return job;
  const next = withLog(job, now, 'ERROR', 'maxJobDurationInSeconds reached while robot application was in a failed state');
  return { ...next, status: 'Failed', endedAt: now };
}

function advanceWorldJob(job: WorldGenerationJob, now: number): { job: WorldGenerationJob; worlds: SimulationWorld[] } {
  if (job.status === 'Pending') return { job: { ...job, status: 'Running' }, worlds: [] };
  if (job.status !== 'Running' || now - job.createdAt < job.count * WORLD_GEN_MS_PER_WORLD) return { job, worlds: [] };

  const template = WORLD_TEMPLATES.find(t => t.id === job.templateId)!;
  const worlds: SimulationWorld[] = Array.from({ length: job.count }, (_, i) => {
    const seed = job.seed + i;
    const layout = generateLayout(job.templateId, job.size, job.density, seed);
    const id = `world-${job.id.slice(4)}-${i + 1}`;
    return {
      arn: arn('world', id),
      id,
      name: `${template.name} #${seed}`,
      templateId: job.templateId,
      size: job.size,
      density: job.density,
      seed,
      ...layout,
      generationJobId: job.id,
      createdAt: now,
    };
  });
  return { job: { ...job, status: 'Completed', finishedAt: now, worldIds: worlds.map(w => w.id) }, worlds };
}

/**
 * The simulation service's control loop. Advances every job through
 * Pending → Preparing → Running → Completed/Failed, honouring concurrency limits.
 * Returns the same object when nothing changed so React can skip re-rendering.
 */
export function tick(state: RoboMakerState, now: number): RoboMakerState {
  let changed = false;

  // WorldForge generation jobs
  let worlds = state.worlds;
  const worldJobs = state.worldJobs.map(j => {
    const r = advanceWorldJob(j, now);
    if (r.job !== j) changed = true;
    if (r.worlds.length) worlds = [...worlds, ...r.worlds];
    return r.job;
  });

  // Advance active jobs first so freed capacity can be used by pending jobs this tick.
  let jobs = state.jobs.map(job => {
    let next = job;
    switch (job.status) {
      case 'Preparing':
        next = advancePreparing(job, worlds, now);
        break;
      case 'Running':
        next = advanceRunning(job, now);
        break;
      case 'RunningFailed':
        next = advanceRunningFailed(job, now);
        break;
      case 'Terminating':
        if (now - (job.terminatingAt ?? now) >= TERMINATE_MS) {
          next = withLog({ ...job, status: 'Terminated', endedAt: now }, now, 'INFO', 'Simulation job terminated, resources released');
        }
        break;
    }
    if (next !== job) changed = true;
    return next;
  });

  // Schedule pending jobs (oldest first) within account and batch concurrency limits.
  const isActive = (j: SimulationJob) => ACTIVE_STATUSES.includes(j.status);
  let active = jobs.filter(isActive).length;
  const activeByBatch = new Map<string, number>();
  for (const j of jobs) if (j.batchId && isActive(j)) activeByBatch.set(j.batchId, (activeByBatch.get(j.batchId) ?? 0) + 1);

  const pendingOrder = jobs
    .map((j, i) => ({ j, i }))
    .filter(({ j }) => j.status === 'Pending')
    .sort((a, b) => a.j.createdAt - b.j.createdAt);

  if (pendingOrder.length) {
    jobs = [...jobs];
    for (const { j, i } of pendingOrder) {
      if (active >= ACCOUNT_CONCURRENCY_LIMIT) break;
      if (j.batchId) {
        const batch = state.batches.find(b => b.id === j.batchId);
        const used = activeByBatch.get(j.batchId) ?? 0;
        if (batch && used >= batch.maxConcurrency) continue;
        activeByBatch.set(j.batchId, used + 1);
      }
      active++;
      changed = true;
      jobs[i] = advancePreparing(
        withLog({ ...j, status: 'Preparing', preparingAt: now, prepStage: 0 }, now, 'INFO', 'Capacity available — job moved to Preparing'),
        worlds,
        now
      );
    }
  }

  return changed ? { ...state, jobs, worlds, worldJobs } : state;
}

export function cancelJob(job: SimulationJob, now: number): SimulationJob {
  if (job.status === 'Pending') {
    return withLog({ ...job, status: 'Terminated', endedAt: now }, now, 'INFO', 'Job cancelled before it started');
  }
  if (['Preparing', 'Running', 'RunningFailed'].includes(job.status)) {
    return withLog({ ...job, status: 'Terminating', terminatingAt: now }, now, 'WARN', 'CancelSimulationJob requested — terminating');
  }
  return job;
}

export function newJobLog(job: SimulationJob, now: number): SimulationJob {
  return withLog(job, now, 'INFO', `CreateSimulationJob accepted — ${job.arn}`);
}
