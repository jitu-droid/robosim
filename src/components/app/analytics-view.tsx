'use client';

import { useMemo, useState, useTransition } from 'react';
import { BarChart3, CheckCircle2, DollarSign, Loader2, Ruler, Sparkles, Target } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { runAiAnalysis } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { algorithmStats, heuristicAnalysis, isFinished, isSuccess, resultsSummary, type AlgorithmStats } from '@/lib/robomaker/insights';
import { formatUsd, jobCost, PRICE_PER_SU_HOUR, suHours } from '@/lib/robomaker/pricing';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ALGORITHM_COLORS, type SimulationJob } from '@/lib/robomaker/types';
import { href, navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { ALGORITHMS } from './job-helpers';
import { AlgorithmTag, Card, CardHeader, EmptyState, PageHeader, plural, SimpleMarkdown, StatTile } from './shared';

const METRICS: { key: keyof AlgorithmStats; label: string; unit: string; better: 'low' | 'high' }[] = [
  { key: 'successRate', label: 'Success rate', unit: '%', better: 'high' },
  { key: 'avgPathLength', label: 'Path length', unit: 'm', better: 'low' },
  { key: 'avgOptimality', label: 'Optimality vs A*', unit: '%', better: 'high' },
  { key: 'avgPlanningMs', label: 'Planning time', unit: 'ms', better: 'low' },
  { key: 'avgNodes', label: 'Nodes expanded', unit: '', better: 'low' },
  { key: 'avgEnergy', label: 'Energy', unit: 'J', better: 'low' },
  { key: 'avgTurns', label: 'Turns', unit: '', better: 'low' },
  { key: 'avgClearance', label: 'Minimum clearance', unit: 'm', better: 'high' },
];

const AXIS = { stroke: 'hsl(240 5% 40%)', fontSize: 11, tickLine: false, axisLine: false } as const;
const TOOLTIP = {
  contentStyle: { backgroundColor: 'hsl(240 6% 9%)', border: '1px solid hsl(240 5% 18%)', borderRadius: 6, fontSize: 12 },
  labelStyle: { color: 'hsl(240 6% 94%)', marginBottom: 4 },
  itemStyle: { color: 'hsl(240 6% 85%)' },
};

export default function AnalyticsView() {
  const { state } = useRoboMaker();
  const now = useNow(1000);
  const [metricKey, setMetricKey] = useState<keyof AlgorithmStats>('avgPathLength');

  const finished = state.jobs.filter(isFinished);
  const successful = finished.filter(isSuccess);
  const stats = useMemo(() => algorithmStats(state.jobs), [state.jobs]);
  const metric = METRICS.find(m => m.key === metricKey)!;
  const totalCost = state.jobs.reduce((sum, j) => sum + jobCost(j, now), 0);
  const totalSuHours = state.jobs.reduce((sum, j) => sum + suHours(j, now), 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const barData = stats.filter(s => s.runs > 0).map(s => ({ name: s.label, algorithm: s.algorithm, value: Number((s[metricKey] as number).toFixed(2)) }));
  const lineData = [...successful]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-20)
    .map((j, i) => ({
      name: `#${i + 1}`,
      'Path length (m)': Number(j.metrics!.pathLength.toFixed(2)),
      'Optimality (%)': Number((j.metrics!.optimality ?? 0).toFixed(1)),
    }));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Metrics across every finished job, the benchmark comparison, AI-written insights and simulation cost. The benchmark, AI insights and cost explorer are RoboSim additions beyond RoboMaker."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Finished jobs" value={finished.length} icon={Target} sub={`${state.jobs.length} in total`} />
        <StatTile
          label="Success rate"
          value={finished.length ? `${Math.round((successful.length / finished.length) * 100)}%` : '—'}
          icon={CheckCircle2}
          sub={`${successful.length} reached the goal`}
        />
        <StatTile label="Average path" value={successful.length ? `${avg(successful.map(j => j.metrics!.pathLength)).toFixed(1)} m` : '—'} icon={Ruler} sub="Successful jobs" />
        <StatTile label="Simulation spend" value={formatUsd(totalCost)} icon={DollarSign} sub={`${totalSuHours.toFixed(4)} SU-hours`} />
      </div>

      {finished.length === 0 ? (
        <EmptyState icon={BarChart3} title="No finished jobs yet" action={<Button size="sm" onClick={() => navigate({ view: 'new-job' })}>Create simulation job</Button>}>
          Run a few jobs, or benchmark all three planners, to fill these charts.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Planner comparison"
                description={`Average per planner · ${metric.better === 'low' ? 'lower' : 'higher'} is better`}
                actions={
                  <Select value={metricKey as string} onValueChange={v => setMetricKey(v as keyof AlgorithmStats)}>
                    <SelectTrigger className="h-8 w-44 text-xs">
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
                }
              />
              <div className="h-[280px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barCategoryGap="30%">
                    <CartesianGrid stroke="hsl(240 5% 15%)" vertical={false} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis {...AXIS} width={56} unit={metric.unit ? ` ${metric.unit}` : ''} />
                    <Tooltip {...TOOLTIP} cursor={{ fill: 'hsl(240 5% 100% / 0.03)' }} formatter={(v: number) => [`${v} ${metric.unit}`, metric.label]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                      {barData.map(d => (
                        <Cell key={d.algorithm} fill={ALGORITHM_COLORS[d.algorithm]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Recent successful jobs" description={`Path length and optimality, last ${plural(lineData.length, 'job')}`} />
              <div className="h-[280px] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid stroke="hsl(240 5% 15%)" vertical={false} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis yAxisId="l" {...AXIS} width={40} />
                    <YAxis yAxisId="r" orientation="right" {...AXIS} width={40} domain={[0, 100]} />
                    <Tooltip {...TOOLTIP} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'hsl(240 5% 60%)' }} />
                    <Line yAxisId="l" type="monotone" dataKey="Path length (m)" stroke="hsl(258 90% 66%)" strokeWidth={2} dot={{ r: 2.5 }} />
                    <Line yAxisId="r" type="monotone" dataKey="Optimality (%)" stroke="hsl(240 5% 70%)" strokeWidth={2} dot={{ r: 2.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <PlannerSummary stats={stats} />
          <BenchmarkResults />

          <div className="grid gap-6 lg:grid-cols-5">
            <AiInsights className="lg:col-span-3" />
            <CostExplorer className="lg:col-span-2" now={now} />
          </div>
        </div>
      )}
    </>
  );
}

function PlannerSummary({ stats }: { stats: AlgorithmStats[] }) {
  return (
    <Card>
      <CardHeader title="Per-planner averages" description="Across every finished job; averages only include jobs that reached the goal" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Planner</th>
              <th className="px-5 py-2.5 text-right font-medium">Runs</th>
              <th className="px-5 py-2.5 text-right font-medium">Success</th>
              <th className="px-5 py-2.5 text-right font-medium">Path</th>
              <th className="px-5 py-2.5 text-right font-medium">Optimality</th>
              <th className="px-5 py-2.5 text-right font-medium">Planning</th>
              <th className="px-5 py-2.5 text-right font-medium">Nodes</th>
              <th className="px-5 py-2.5 text-right font-medium">Energy</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs tabular-nums">
            {stats.map(s => (
              <tr key={s.algorithm} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-2.5 font-sans text-sm">
                  <AlgorithmTag algorithm={s.algorithm} />
                </td>
                <td className="px-5 py-2.5 text-right">{s.runs}</td>
                <td className="px-5 py-2.5 text-right">{s.runs ? `${s.successRate.toFixed(0)}%` : '—'}</td>
                <td className="px-5 py-2.5 text-right">{s.succeeded ? `${s.avgPathLength.toFixed(1)} m` : '—'}</td>
                <td className="px-5 py-2.5 text-right">{s.succeeded ? `${s.avgOptimality.toFixed(1)}%` : '—'}</td>
                <td className="px-5 py-2.5 text-right">{s.succeeded ? `${s.avgPlanningMs.toFixed(2)} ms` : '—'}</td>
                <td className="px-5 py-2.5 text-right">{s.succeeded ? s.avgNodes.toFixed(0) : '—'}</td>
                <td className="px-5 py-2.5 text-right">{s.succeeded ? `${s.avgEnergy.toFixed(0)} J` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BenchmarkResults() {
  const { state } = useRoboMaker();
  const benchmarks = state.batches.filter(b => b.kind === 'benchmark').slice(0, 4);
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
    <Card>
      <CardHeader title="Benchmark results" description="Same robot, world, start and goal for every planner. The best value in each column is highlighted." />
      <div className="divide-y divide-border">
        {benchmarks.map(b => {
          const jobs = state.jobs.filter(j => j.batchId === b.id);
          const ok = jobs.filter(isSuccess);
          const best = cols.map(c => {
            const values = ok.map(c.get).filter((v): v is number => v !== null);
            if (values.length < 2) return null;
            return c.better === 'low' ? Math.min(...values) : Math.max(...values);
          });
          return (
            <div key={b.id} className="overflow-x-auto px-5 py-4">
              <p className="mb-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{b.name}</span> · <span className="font-mono">{b.id}</span>
              </p>
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Planner</th>
                    <th className="py-2 pr-4 font-medium">Result</th>
                    {cols.map(c => (
                      <th key={c.label} className="py-2 pr-4 text-right font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className="cursor-pointer border-t border-border/60 hover:bg-accent/40" onClick={() => navigate({ view: 'job', id: j.id })}>
                      <td className="py-2 pr-4">
                        <AlgorithmTag algorithm={j.algorithm} />
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {isSuccess(j) ? (
                          <span className="text-emerald-400">Reached goal</span>
                        ) : isFinished(j) || j.status === 'Terminated' ? (
                          <span className="text-red-400">{j.failureCode ?? j.status}</span>
                        ) : (
                          <span className="text-sky-300">{j.status}</span>
                        )}
                      </td>
                      {cols.map((c, i) => {
                        const v = isSuccess(j) ? c.get(j) : null;
                        const isBest = v !== null && best[i] !== null && v === best[i];
                        return (
                          <td key={c.label} className="py-2 pr-4 text-right font-mono text-xs tabular-nums">
                            <span className={cn(isBest && 'rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300')}>{v === null ? '—' : c.fmt(v)}</span>
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
    </Card>
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
    <Card className={className}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI insights
          </span>
        }
        description="Gemini reviews every finished job and explains the results"
        actions={
          <Button size="sm" onClick={analyse} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {result ? 'Analyse again' : 'Analyse results'}
          </Button>
        }
      />
      <div className="p-5">
        {!result && !pending && <p className="text-sm text-muted-foreground">Generate a written comparison of the planners, an explanation of any failures and tuning recommendations.</p>}
        {pending && <p className="text-sm text-muted-foreground">Analysing {plural(state.jobs.filter(isFinished).length, 'job')}…</p>}
        {result && !pending && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className={cn('rounded-md px-2 py-0.5 font-medium', result.source === 'ai' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                {result.source === 'ai' ? 'Gemini 2.5 Flash' : 'Built-in analyser'}
              </span>
              {result.note && <span className="text-muted-foreground">AI unavailable: {result.note}</span>}
            </div>
            <SimpleMarkdown text={result.text} />
          </>
        )}
      </div>
    </Card>
  );
}

function CostExplorer({ className, now }: { className?: string; now: number }) {
  const { state } = useRoboMaker();
  const rows = ALGORITHMS.map(a => {
    const jobs = state.jobs.filter(j => j.algorithm === a && j.preparingAt);
    return { algorithm: a, jobs: jobs.length, cost: jobs.reduce((s, j) => s + jobCost(j, now), 0) };
  });
  const maxCost = Math.max(...rows.map(r => r.cost), 1e-9);
  const billed = state.jobs.filter(j => j.endedAt && j.preparingAt);
  const avgPerJob = billed.length ? billed.reduce((s, j) => s + jobCost(j, now), 0) / billed.length : 0;

  return (
    <Card className={className}>
      <CardHeader title="Cost explorer" description={`$${PRICE_PER_SU_HOUR.toFixed(2)} per SU-hour, billed from Preparing until the job ends`} />
      <div className="space-y-5 p-5">
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.algorithm}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <AlgorithmTag algorithm={r.algorithm} />
                <span className="font-mono text-xs tabular-nums">
                  {formatUsd(r.cost)} <span className="text-muted-foreground">· {plural(r.jobs, 'job')}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(r.cost / maxCost) * 100}%`, background: ALGORITHM_COLORS[r.algorithm] }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3">
            <p className="eyebrow">Average per job</p>
            <p className="mt-1 font-mono text-lg font-medium tabular-nums">{formatUsd(avgPerJob)}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="eyebrow">1,000 runs</p>
            <p className="mt-1 font-mono text-lg font-medium tabular-nums">{formatUsd(avgPerJob * 1000)}</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          A higher real-time factor finishes jobs sooner, so they bill fewer SU-hours. See{' '}
          <a href={href({ view: 'about' })} className="text-foreground hover:underline">
            how pricing worked
          </a>
          .
        </p>
      </div>
    </Card>
  );
}
