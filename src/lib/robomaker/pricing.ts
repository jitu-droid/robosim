import type { SimulationJob } from './types';

/**
 * RoboMaker billed simulation by the simulation-unit hour (1 SU = 1 vCPU + 2 GB RAM).
 * $0.40/SU-hour was the published us-east-1 rate; change it here if your region differed.
 */
export const PRICE_PER_SU_HOUR = 0.4;

/** The robot application always needs 1 SU; the world adds 1–3 SUs depending on its size. */
export const ROBOT_APP_SIMULATION_UNITS = 1;

/** Wall-clock seconds the job has been billed for (Preparing until it ends). */
export function billedSeconds(job: SimulationJob, now: number): number {
  if (!job.preparingAt) return 0;
  const end = job.endedAt ?? now;
  return Math.max(0, (end - job.preparingAt) / 1000);
}

export function suHours(job: SimulationJob, now: number): number {
  return (job.simulationUnits * billedSeconds(job, now)) / 3600;
}

export function jobCost(job: SimulationJob, now: number): number {
  return suHours(job, now) * PRICE_PER_SU_HOUR;
}

export function formatUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(5)}`;
  return `$${value.toFixed(2)}`;
}
