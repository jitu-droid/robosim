import { ALGORITHM_LABELS, type Algorithm, type SimulationJob, type SimulationWorld } from './types';

export interface AlgorithmStats {
  algorithm: Algorithm;
  label: string;
  runs: number;
  succeeded: number;
  failed: number;
  successRate: number; // %
  avgPathLength: number;
  avgOptimality: number;
  avgPlanningMs: number;
  avgNodes: number;
  avgEnergy: number;
  avgSimDuration: number;
  avgTurns: number;
  avgClearance: number;
}

const ALGORITHMS: Algorithm[] = ['astar', 'rrt', 'potentialField'];

export function isFinished(job: SimulationJob): boolean {
  return job.status === 'Completed' || job.status === 'Failed';
}

export function isSuccess(job: SimulationJob): boolean {
  return job.status === 'Completed' && job.goalReached === true;
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function algorithmStats(jobs: SimulationJob[]): AlgorithmStats[] {
  return ALGORITHMS.map(algorithm => {
    const runs = jobs.filter(j => j.algorithm === algorithm && isFinished(j));
    const ok = runs.filter(isSuccess);
    const metrics = ok.map(j => j.metrics!).filter(Boolean);
    return {
      algorithm,
      label: ALGORITHM_LABELS[algorithm],
      runs: runs.length,
      succeeded: ok.length,
      failed: runs.length - ok.length,
      successRate: runs.length ? (ok.length / runs.length) * 100 : 0,
      avgPathLength: avg(metrics.map(m => m.pathLength)),
      avgOptimality: avg(metrics.map(m => m.optimality ?? 0)),
      avgPlanningMs: avg(metrics.map(m => m.planningMs)),
      avgNodes: avg(metrics.map(m => m.nodesExpanded)),
      avgEnergy: avg(metrics.map(m => m.energy)),
      avgSimDuration: avg(metrics.map(m => m.simDuration)),
      avgTurns: avg(metrics.map(m => m.turns)),
      avgClearance: avg(metrics.map(m => m.minClearance)),
    };
  });
}

/** Compact, line-per-job description of results to send to the LLM. */
export function resultsSummary(jobs: SimulationJob[], worlds: SimulationWorld[]): string {
  const finished = jobs.filter(isFinished).slice(0, 60);
  const lines = finished.map(j => {
    const world = worlds.find(w => w.id === j.worldId);
    const where = world ? `${world.templateId}/${world.size}` : j.worldName;
    if (!j.metrics) return `${ALGORITHM_LABELS[j.algorithm]} | world=${where} | robot=${j.robotType} | FAILED (${j.failureCode}): ${j.failureReason}`;
    const m = j.metrics;
    return [
      ALGORITHM_LABELS[j.algorithm],
      `world=${where}`,
      `robot=${j.robotType}`,
      isSuccess(j) ? 'SUCCESS' : 'GOAL NOT REACHED',
      `path=${m.pathLength.toFixed(2)}m`,
      `optimality=${m.optimality?.toFixed(1) ?? 'n/a'}%`,
      `planning=${m.planningMs.toFixed(2)}ms`,
      `nodes=${m.nodesExpanded}`,
      `time=${m.simDuration.toFixed(1)}s`,
      `energy=${m.energy.toFixed(0)}J`,
      `turns=${m.turns}`,
      `clearance=${m.minClearance.toFixed(2)}m`,
    ].join(' | ');
  });
  const stats = algorithmStats(jobs)
    .filter(s => s.runs)
    .map(
      s =>
        `${s.label}: runs=${s.runs}, success=${s.successRate.toFixed(0)}%, avgPath=${s.avgPathLength.toFixed(2)}m, avgOptimality=${s.avgOptimality.toFixed(1)}%, avgPlanning=${s.avgPlanningMs.toFixed(2)}ms, avgNodes=${s.avgNodes.toFixed(0)}`
    );
  return `Per-algorithm averages:\n${stats.join('\n')}\n\nIndividual jobs:\n${lines.join('\n')}`;
}

/** Rule-based analysis used when the Gemini API is not configured. */
export function heuristicAnalysis(jobs: SimulationJob[]): string {
  const stats = algorithmStats(jobs).filter(s => s.runs > 0);
  if (!stats.length) return 'Run some simulation jobs first.';
  const withSuccess = stats.filter(s => s.succeeded > 0);
  const out: string[] = ['## Summary'];

  const mostReliable = [...stats].sort((a, b) => b.successRate - a.successRate)[0];
  const shortest = [...withSuccess].sort((a, b) => b.avgOptimality - a.avgOptimality || a.avgPathLength - b.avgPathLength)[0];
  const fastest = [...withSuccess].sort((a, b) => a.avgPlanningMs - b.avgPlanningMs)[0];
  out.push(
    `Across ${stats.reduce((n, s) => n + s.runs, 0)} finished jobs, **${mostReliable.label}** was the most reliable (${mostReliable.successRate.toFixed(0)}% success).` +
      (shortest ? ` **${shortest.label}** produced the shortest routes (${shortest.avgOptimality.toFixed(1)}% of optimal on average).` : '') +
      (fastest ? ` **${fastest.label}** planned fastest (${fastest.avgPlanningMs.toFixed(2)} ms).` : '')
  );

  out.push('', '## Algorithm comparison');
  for (const s of stats) {
    out.push(
      `- **${s.label}** — ${s.runs} run${s.runs === 1 ? '' : 's'}, ${s.successRate.toFixed(0)}% success` +
        (s.succeeded
          ? `, avg path ${s.avgPathLength.toFixed(2)} m (${s.avgOptimality.toFixed(1)}% optimal), ${s.avgNodes.toFixed(0)} nodes, ${s.avgTurns.toFixed(1)} turns, ${s.avgEnergy.toFixed(0)} J.`
          : '. No successful runs yet.')
    );
  }

  const failures = jobs.filter(j => j.status === 'Failed' || (j.status === 'Completed' && !j.goalReached));
  out.push('', '## Failures');
  if (!failures.length) out.push('- No failed jobs.');
  else {
    const byReason = new Map<string, number>();
    for (const f of failures) {
      const reason = `${ALGORITHM_LABELS[f.algorithm]}: ${f.failureReason?.replace(/[\d.]+ m/g, 'N m') ?? 'max duration reached before goal'}`;
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
    for (const [reason, n] of byReason) out.push(`- ${n}× ${reason}`);
  }

  out.push(
    '',
    '## Recommendations',
    '- Use **A*** for structured worlds (maze, warehouse, office): it is complete and optimal on a grid.',
    '- Use **RRT** in large open or continuous spaces where grid resolution is costly; add path smoothing to cut its extra turns.',
    '- Use **Potential Field** only for reactive avoidance in open, cluttered spaces; it gets trapped in local minima behind walls.'
  );
  return out.join('\n');
}
