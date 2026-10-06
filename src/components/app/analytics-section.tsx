'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { runAiAnalysis } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { algorithmStats, heuristicAnalysis, isFinished, isSuccess, resultsSummary, type AlgorithmStats } from '@/lib/robomaker/insights';
import { formatUsd, jobCost, PRICE_PER_SU_HOUR, suHours } from '@/lib/robomaker/pricing';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ALGORITHM_COLORS, ALGORITHM_LABELS, type SimulationJob } from '@/lib/robomaker/types';
import { cn } from '@/lib/utils';
import { EmptyState, Panel, SectionHeader, SimpleMarkdown } from './shared';

const METRICS: { key: keyof AlgorithmStats; label: string; unit: string; better: 'low' | 'high' }[] = [
  { key: 'successRate', label: 'Success rate', unit: '%', better: 'high' },
  { key: 'avgPathLength', label: 'Avg path length', unit: 'm', better: 'low' },
  { key: 'avgOptimality', label: 'Avg optimality vs A*', unit: '%', better: 'high' },
  { key: 'avgPlanningMs', label: 'Avg planning time', unit: 'ms', better: 'low' },
  { key: 'avgNodes', label: 'Avg nodes expanded', unit: '', better: 'low' },
  { key: 'avgEnergy', label: 'Avg energy', unit: 'J', better: 'low' },
  { key: 'avgTurns', label: 'Avg turns', unit: '', better: 'low' },
  { key: 'avgClearance', label: 'Avg min clearance', unit: 'm', better: 'high' },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111', borderColor: '#333', borderRadius: 8 },
  labelStyle: { color: '#fff' },
  itemStyle: { color: '#e5e5e5' },
};

export default function AnalyticsSection() {
  const { state } = useRoboMaker();
  const now = useNow(1000);
  const [metricKey, setMetricKey] = useState<keyof AlgorithmStats>('avgPathLength');

  const finished = state.jobs.filter(isFinished);
  const stats = useMemo(() => algorithmStats(state.jobs), [state.jobs]);
  const metric = METRICS.find(m => m.key === metricKey)!;

  const successful = finished.filter(isSuccess);
  const totalCost = state.jobs.reduce((sum, j) => sum + jobCost(j, now), 0);
  const totalSuHours = state.jobs.reduce((sum, j) => sum + suHours(j, now), 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const kpis = [
    { icon: '🎯', label: 'Finished jobs', value: String(finished.length), sub: `${state.jobs.length} total` },
    { icon: '✅', label: 'Success rate', value: finished.length ? `${((successful.length / finished.length) * 100).toFixed(0)}%` : '—', sub: `${successful.length} reached goal` },
    { icon: '📏', label: 'Avg path length', value: successful.length ? `${avg(successful.map(j => j.metrics!.pathLength)).toFixed(1)} m` : '—', sub: 'successful jobs' },
    { icon: '💰', label: 'Simulation spend', value: formatUsd(totalCost), sub: `${totalSuHours.toFixed(4)} SU-hours` },
  ];

  const barData = stats.filter(s => s.runs > 0).map(s => ({ name: s.label, algorithm: s.algorithm, value: Number((s[metricKey] as number).toFixed(2)) }));
  const lineData = [...successful]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-20)
    .map((j, i) => ({
      name: String(i + 1),
      job: j.id,
      'Path length (m)': Number(j.metrics!.pathLength.toFixed(2)),
      'Optimality (%)': Number((j.metrics!.optimality ?? 0).toFixed(1)),
    }));

  return (
    <section id="analytics" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader
        icon="📊"
        title="Analytics & Insights"
        subtitle="CloudWatch-style metrics across every job, plus RoboSim's benchmark, AI and cost enhancements."
        apis={['CloudWatch Metrics', 'Cost Explorer', 'Gemini AI']}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-gradient-to-br from-background via-background to-primary/5 p-5">
            <span className="text-2xl">{k.icon}</span>
            <p className="mt-2 font-heading text-3xl font-bold">{k.value}</p>
            <p className="text-[11px] uppercase tracking-[1.5px] text-muted-foreground">{k.label}</p>
            <p className="text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {finished.length === 0 ? (
        <EmptyState icon="📈" title="No finished jobs yet">
          Run a few jobs (try <strong>🏁 Benchmark all 3 planners</strong>) to fill these charts.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Panel>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Planner comparison</p>
                  <p className="text-xs text-muted-foreground">{metric.better === 'low' ? 'Lower' : 'Higher'} is better</p>
                </div>
                <Select value={metricKey as string} onValueChange={v => setMetricKey(v as keyof AlgorithmStats)}>
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map(m => (
                      <SelectItem key={m.key} value={m.key as string}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} unit={metric.unit ? ` ${metric.unit}` : ''} width={70} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: number) => [`${v} ${metric.unit}`, metric.label]} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map(d => (
                        <Cell key={d.algorithm} fill={ALGORITHM_COLORS[d.algorithm]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel>
              <p className="font-semibold">Recent successful jobs</p>
              <p className="mb-4 text-xs text-muted-foreground">Path length and optimality for the last {lineData.length} jobs</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis yAxisId="l" stroke="#888" fontSize={12} />
                    <YAxis yAxisId="r" orientation="right" stroke="#888" fontSize={12} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="l" type="monotone" dataKey="Path length (m)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="r" type="monotone" dataKey="Optimality (%)" stroke="#e5e5e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <BenchmarkTable />

          <div className="grid gap-6 lg:grid-cols-5 mt-6">
            <AiInsights className="lg:col-span-3" />
            <CostExplorer className="lg:col-span-2" now={now} />
          </div>
        </>
      )}
    </section>
  );
}

function BenchmarkTable() {
  const { state, selectJob } = useRoboMaker();
  const benchmarks = state.batches.filter(b => b.kind === 'benchmark').slice(0, 5);
  if (!benchmarks.length) return null;

  const cols: { label: string; get: (j: SimulationJob) => number | null; fmt: (v: number) => string; better: 'low' | 'high' }[] = [
    { label: 'Path', get: j => j.metrics?.pathLength ?? null, fmt: v => `${v.toFixed(1)} m`, better: 'low' },
    { label: 'Optimality', get: j => j.metrics?.optimality ?? null, fmt: v => `${v.toFixed(0)}%`, better: 'high' },
    { label: 'Planning', get: j => j.metrics?.planningMs ?? null, fmt: v => `${v.toFixed(2)} ms`, better: 'low' },
    { label: 'Nodes', get: j => j.metrics?.nodesExpanded ?? null, fmt: v => v.toLocaleString(), better: 'low' },
    { label: 'Time', get: j => j.metrics?.simDuration ?? null, fmt: v => `${v.toFixed(1)} s`, better: 'low' },
    { label: 'Energy', get: j => j.metrics?.energy ?? null, fmt: v => `${v.toFixed(0)} J`, better: 'low' },
  ];

  return (
    <Panel>
      <p className="font-semibold">🏁 Benchmark results</p>
      <p className="mb-4 text-xs text-muted-foreground">Same robot, world, start and goal for each planner. Best value per column is highlighted.</p>
      <div className="space-y-6">
        {benchmarks.map(b => {
          const jobs = state.jobs.filter(j => j.batchId === b.id);
          const ok = jobs.filter(isSuccess);
          const best = cols.map(c => {
            const values = ok.map(c.get).filter((v): v is number => v !== null);
            if (!values.length) return null;
            return c.better === 'low' ? Math.min(...values) : Math.max(...values);
          });
          return (
            <div key={b.id} className="overflow-x-auto">
              <p className="mb-2 text-xs text-muted-foreground">
                <span className="font-mono">{b.id}</span> · {b.name}
              </p>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Planner</th>
                    <th className="py-2 pr-3">Result</th>
                    {cols.map(c => (
                      <th key={c.label} className="py-2 pr-3">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className="cursor-pointer border-t border-border/60 hover:bg-primary/5" onClick={() => selectJob(j.id)}>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: ALGORITHM_COLORS[j.algorithm] }} />
                          {ALGORITHM_LABELS[j.algorithm]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {isSuccess(j) ? <span className="text-emerald-400">✓ Goal</span> : isFinished(j) || j.status === 'Terminated' ? <span className="text-red-400">✗ {j.failureCode ?? j.status}</span> : <span className="text-sky-300">{j.status}…</span>}
                      </td>
                      {cols.map((c, i) => {
                        const v = isSuccess(j) ? c.get(j) : null;
                        const isBest = v !== null && best[i] !== null && v === best[i] && ok.length > 1;
                        return (
                          <td key={c.label} className={cn('py-2 pr-3 font-mono text-xs', isBest && 'font-bold text-emerald-400')}>
                            {v === null ? '—' : c.fmt(v)}
                            {isBest && ' ★'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AiInsights({ className }: { className?: string }) {
  const { state } = useRoboMaker();
  const [result, setResult] = useState<{ source: 'ai' | 'builtin'; text: string; note?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const analyse = () => {
    const summary = resultsSummary(state.jobs, state.worlds);
    startTransition(async () => {
      const res = await runAiAnalysis(summary);
      if (res.ok) setResult({ source: 'ai', text: res.analysis });
      else setResult({ source: 'builtin', text: heuristicAnalysis(state.jobs), note: res.error });
    });
  };

  return (
    <Panel className={cn('border-primary/30', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> AI performance insights
          </p>
          <p className="text-xs text-muted-foreground">Gemini reviews every finished job and explains the results</p>
        </div>
        <Button onClick={analyse} disabled={pending} className="bg-primary hover:bg-primary/90">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {result ? 'Re-analyse' : 'Analyse results'}
        </Button>
      </div>
      {!result && !pending && <p className="text-sm text-muted-foreground">Click “Analyse results” to generate a report from your simulation runs.</p>}
      {pending && <p className="text-sm text-muted-foreground">Analysing {state.jobs.filter(isFinished).length} jobs…</p>}
      {result && !pending && (
        <>
          <span className={cn('mb-3 inline-block rounded-full px-2 py-0.5 text-[11px]', result.source === 'ai' ? 'bg-primary/20 text-primary' : 'bg-zinc-500/20 text-zinc-300')}>
            {result.source === 'ai' ? 'Generated by Gemini 2.5 Flash' : 'Built-in analyser (AI unavailable)'}
          </span>
          {result.note && <p className="mb-3 text-[11px] text-muted-foreground">Reason: {result.note}</p>}
          <SimpleMarkdown text={result.text} />
        </>
      )}
    </Panel>
  );
}

function CostExplorer({ className, now }: { className?: string; now: number }) {
  const { state } = useRoboMaker();
  const byAlgorithm = (['astar', 'rrt', 'potentialField'] as const).map(a => {
    const jobs = state.jobs.filter(j => j.algorithm === a && j.preparingAt);
    const cost = jobs.reduce((s, j) => s + jobCost(j, now), 0);
    return { algorithm: a, jobs: jobs.length, cost, perJob: jobs.length ? cost / jobs.length : 0 };
  });
  const billed = state.jobs.filter(j => j.endedAt && j.preparingAt);
  const avgPerJob = billed.length ? billed.reduce((s, j) => s + jobCost(j, now), 0) / billed.length : 0;

  return (
    <Panel className={className}>
      <p className="font-semibold">💰 Cost explorer</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Estimated at ${PRICE_PER_SU_HOUR.toFixed(2)} per SU-hour, billed from Preparing until the job ends
      </p>
      <div className="space-y-2">
        {byAlgorithm.map(r => (
          <div key={r.algorithm} className="flex items-center gap-3 rounded border border-border p-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ background: ALGORITHM_COLORS[r.algorithm] }} />
            <span className="flex-1">{ALGORITHM_LABELS[r.algorithm]}</span>
            <span className="text-xs text-muted-foreground">{r.jobs} job{r.jobs === 1 ? '' : 's'}</span>
            <span className="w-24 text-right font-mono text-xs">{formatUsd(r.cost)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg per job</p>
          <p className="font-mono text-lg font-semibold">{formatUsd(avgPerJob)}</p>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">1,000 runs projected</p>
          <p className="font-mono text-lg font-semibold">{formatUsd(avgPerJob * 1000)}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Tip: a higher real-time factor finishes jobs sooner, so they bill fewer SU-hours.</p>
    </Panel>
  );
}
