'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, Copy, Download, FileJson, FileText, Loader2, Play, Square, Table2, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { createSimulationJobCli } from '@/lib/robomaker/cli';
import { jobSimSeconds } from '@/lib/robomaker/engine';
import { LOG_GROUP } from '@/lib/robomaker/ids';
import { downloadText, jobOutputs, logStreamName, outputPrefix } from '@/lib/robomaker/outputs';
import { formatUsd, jobCost } from '@/lib/robomaker/pricing';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ALGORITHM_LABELS, ROBOT_TYPE_LABELS, TERMINAL_STATUSES, type LogLevel, type SimulationJob } from '@/lib/robomaker/types';
import { href, navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { AlgorithmTag, Card, CardHeader, CopyText, EmptyState, formatDuration, PageHeader, StatusBadge } from './shared';
import SimulationViewer, { currentPose } from './simulation-viewer';

export default function JobDetailView({ id }: { id: string }) {
  const rm = useRoboMaker();
  const { state } = rm;
  const { toast } = useToast();
  const now = useNow(150);
  const [overlay, setOverlay] = useState(true);

  const job = state.jobs.find(j => j.id === id);
  const world = job ? state.worlds.find(w => w.id === job.worldId) : undefined;
  const batch = job?.batchId ? state.batches.find(b => b.id === job.batchId) : undefined;
  const isBenchmark = batch?.kind === 'benchmark';
  const benchmarkJobs = useMemo(() => (job && isBenchmark ? state.jobs.filter(j => j.batchId === job.batchId) : []), [job, isBenchmark, state.jobs]);
  const viewerJobs = useMemo(() => {
    if (!job) return [];
    if (!isBenchmark || !overlay) return [job];
    return [job, ...benchmarkJobs.filter(j => j.id !== job.id && j.worldId === job.worldId)];
  }, [job, isBenchmark, overlay, benchmarkJobs]);

  const breadcrumb = (
    <span className="inline-flex items-center gap-1">
      <a href={href({ view: 'jobs' })} className="hover:text-foreground">
        Simulation jobs
      </a>
      <ChevronRight className="h-3 w-3" />
      <span className="font-mono">{id}</span>
    </span>
  );

  if (!job) {
    return (
      <>
        <PageHeader title="Job not found" breadcrumb={breadcrumb} />
        <EmptyState icon={Play} title="This simulation job does not exist" action={<Button size="sm" onClick={() => navigate({ view: 'jobs' })}>Back to jobs</Button>}>
          It may have been deleted, or the demo data was reset.
        </EmptyState>
      </>
    );
  }

  const terminal = TERMINAL_STATUSES.includes(job.status);

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="break-all">{job.name}</span>
            <StatusBadge job={job} />
          </span>
        }
        description={<CopyText text={job.arn} />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const c = rm.cloneJob(job.id);
                if (c) {
                  toast({ title: 'Job cloned', description: c.id });
                  navigate({ view: 'job', id: c.id });
                }
              }}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Clone
            </Button>
            {terminal ? (
              <Button
                variant="outline"
                size="sm"
                className="hover:text-destructive"
                onClick={() => {
                  rm.deleteJob(job.id);
                  navigate({ view: 'jobs' });
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="hover:text-destructive" disabled={job.status === 'Terminating'} onClick={() => rm.cancelJob(job.id)}>
                <Square className="mr-1.5 h-3 w-3" /> Cancel job
              </Button>
            )}
          </>
        }
      />

      {job.failureCode && (
        <div className="mb-6 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="text-sm">
            <p className="font-medium text-red-300">{job.failureCode}</p>
            <p className="text-red-200/80">{job.failureReason}</p>
          </div>
        </div>
      )}
      {job.status === 'Completed' && job.goalReached === false && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-amber-200/90">
            The job reached maxJobDurationInSeconds before the robot got to the goal. Clone it with a longer duration or a higher real-time factor.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{job.worldName}</span>
                <span className="text-muted-foreground">· RTF {job.realTimeFactor}×</span>
              </div>
              {isBenchmark && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={overlay} onCheckedChange={setOverlay} />
                  Show all planners
                </label>
              )}
            </div>
            {world ? (
              <div className="relative">
                <SimulationViewer world={world} jobs={viewerJobs} />
                {viewerJobs.length > 1 && (
                  <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-md border border-border bg-background/80 px-3 py-2 text-xs backdrop-blur">
                    {viewerJobs.map(j => (
                      <div key={j.id} className="flex items-center justify-between gap-4">
                        <AlgorithmTag algorithm={j.algorithm} />
                        <span className="tabular-nums text-muted-foreground">
                          {j.status === 'Completed' && j.goalReached ? `${j.metrics!.simDuration.toFixed(1)}s` : j.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="pointer-events-none absolute bottom-3 right-3 hidden text-[11px] text-muted-foreground sm:block">Drag to orbit · click, then scroll to zoom</p>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState icon={Play} title="World deleted">
                  The world used by this job no longer exists, so it can&apos;t be rendered.
                </EmptyState>
              </div>
            )}
          </Card>
          <Telemetry job={job} now={now} />
          {isBenchmark && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Benchmark jobs:</span>
              {benchmarkJobs.map(j => (
                <a
                  key={j.id}
                  href={href({ view: 'job', id: j.id })}
                  className={cn('rounded-md border px-2.5 py-1 transition-colors', j.id === job.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')}
                >
                  <AlgorithmTag algorithm={j.algorithm} />
                </a>
              ))}
              <a href={href({ view: 'analytics' })} className="ml-auto text-muted-foreground hover:text-foreground">
                Compare in analytics
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Lifecycle job={job} />
          <Card>
            <CardHeader title="Configuration" />
            <dl className="divide-y divide-border text-sm">
              {[
                ['Robot application', `${job.robotAppName} v${job.robotAppVersion}`],
                ['Robot type', ROBOT_TYPE_LABELS[job.robotType]],
                ['Planner', ALGORITHM_LABELS[job.algorithm]],
                ['World', job.worldName],
                ['Start', `(${job.start.x}, ${job.start.y})`],
                ['Goal', `(${job.goal.x}, ${job.goal.y})`],
                ['Max duration', `${job.maxJobDurationInSeconds}s`],
                ['Failure behavior', job.failureBehavior],
                ['Simulation units', String(job.simulationUnits)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-5 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {Object.keys(job.tags).length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border px-5 py-3">
                {Object.entries(job.tags).map(([k, v]) => (
                  <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {k}={v}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <Tabs defaultValue="metrics">
          <div className="overflow-x-auto border-b border-border px-3 pt-3">
            <TabsList className="bg-transparent p-0">
              {['metrics', 'logs', 'outputs', 'cli'].map(t => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {{ metrics: 'Metrics', logs: 'Logs', outputs: 'Outputs (S3)', cli: 'AWS CLI' }[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="metrics" className="m-0 p-5">
            <Metrics job={job} />
          </TabsContent>
          <TabsContent value="logs" className="m-0 p-5">
            <LogViewer job={job} />
          </TabsContent>
          <TabsContent value="outputs" className="m-0 p-5">
            <Outputs job={job} now={now} />
          </TabsContent>
          <TabsContent value="cli" className="m-0 p-5">
            <Cli job={job} />
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}

function Telemetry({ job, now }: { job: SimulationJob; now: number }) {
  const pose = currentPose(job, now);
  const sim = Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds);
  const m = job.metrics;
  const items = [
    { label: 'Sim time', value: formatDuration(sim), sub: `max ${job.maxJobDurationInSeconds}s` },
    { label: 'Speed', value: `${pose.speed.toFixed(2)} m/s`, sub: `limit ${job.maxSpeed} m/s` },
    { label: 'Distance', value: `${pose.travelled.toFixed(1)} m`, sub: m ? `of ${m.pathLength.toFixed(1)} m` : 'no path yet' },
    { label: 'Position', value: `${pose.x.toFixed(1)}, ${pose.y.toFixed(1)}`, sub: `heading ${((pose.heading * 180) / Math.PI).toFixed(0)}°` },
    { label: 'Cost', value: formatUsd(jobCost(job, now)), sub: `${job.simulationUnits} SU` },
  ];
  return (
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-5">
      {items.map(i => (
        <div key={i.label} className="min-w-0 bg-card px-4 py-3">
          <p className="eyebrow truncate">{i.label}</p>
          <p className="mt-1 truncate font-mono text-sm font-medium tabular-nums">{i.value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{i.sub}</p>
        </div>
      ))}
    </Card>
  );
}

function Lifecycle({ job }: { job: SimulationJob }) {
  const final = TERMINAL_STATUSES.includes(job.status) ? job.status : job.status === 'Terminating' ? 'Terminating' : null;
  const steps: { label: string; at?: number; state: 'done' | 'current' | 'todo' | 'failed' }[] = [
    { label: 'Pending', at: job.createdAt, state: job.status === 'Pending' ? 'current' : 'done' },
    { label: 'Preparing', at: job.preparingAt, state: job.status === 'Preparing' ? 'current' : job.preparingAt ? 'done' : 'todo' },
    {
      label: job.status === 'RunningFailed' ? 'RunningFailed' : 'Running',
      at: job.runningAt,
      state: job.status === 'Running' || job.status === 'RunningFailed' ? 'current' : job.runningAt ? 'done' : 'todo',
    },
    {
      label: final ?? 'Completed',
      at: job.endedAt ?? job.terminatingAt,
      state: !final ? 'todo' : job.status === 'Completed' ? 'done' : job.status === 'Terminating' ? 'current' : 'failed',
    },
  ];
  return (
    <Card>
      <CardHeader title="Lifecycle" description={`Created ${new Date(job.createdAt).toLocaleTimeString()}`} />
      <ol className="px-5 py-4">
        {steps.map((s, i) => (
          <li key={s.label + i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-px bg-border" />}
            {s.state === 'done' && <CheckCircle2 className="relative h-4 w-4 shrink-0 text-emerald-400" />}
            {s.state === 'current' && <Loader2 className="relative h-4 w-4 shrink-0 animate-spin text-sky-300" />}
            {s.state === 'failed' && <XCircle className="relative h-4 w-4 shrink-0 text-red-400" />}
            {s.state === 'todo' && <Circle className="relative h-4 w-4 shrink-0 text-muted-foreground/50" />}
            <div className="flex flex-1 justify-between gap-2 text-sm leading-4">
              <span className={cn(s.state === 'todo' && 'text-muted-foreground')}>{s.label}</span>
              {s.at && s.state !== 'todo' && (
                <span className="font-mono text-xs text-muted-foreground">
                  {i === 0 ? new Date(s.at).toLocaleTimeString([], { hour12: false }) : `+${((s.at - job.createdAt) / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Metrics({ job }: { job: SimulationJob }) {
  const m = job.metrics;
  if (!m) {
    return <p className="text-sm text-muted-foreground">{job.status === 'Pending' || job.status === 'Preparing' ? 'Metrics appear once the planner has run.' : 'No path was planned for this job.'}</p>;
  }
  const items = [
    ['Path length', `${m.pathLength.toFixed(2)} m`, `straight line ${m.straightLine.toFixed(2)} m`],
    ['Optimality', m.optimality !== null ? `${m.optimality.toFixed(1)}%` : 'n/a', m.optimalLength ? `A* reference ${m.optimalLength.toFixed(2)} m` : ''],
    ['Planning time', `${m.planningMs.toFixed(2)} ms`, 'measured in the browser'],
    ['Nodes expanded', m.nodesExpanded.toLocaleString(), 'search effort'],
    ['Traverse time', `${m.simDuration.toFixed(1)} s`, 'simulated'],
    ['Turns', String(m.turns), 'heading changes over 20°'],
    ['Minimum clearance', `${m.minClearance.toFixed(2)} m`, 'closest approach to an obstacle'],
    ['Energy', `${m.energy.toFixed(0)} J`, 'estimated'],
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
      {items.map(([label, value, sub]) => (
        <div key={label} className="bg-card px-4 py-3">
          <p className="eyebrow">{label}</p>
          <p className="mt-1 font-mono text-base font-medium tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      ))}
    </div>
  );
}

function Outputs({ job, now }: { job: SimulationJob; now: number }) {
  const outputs = jobOutputs(job);
  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow mb-1">Output location</p>
        <CopyText text={outputPrefix(job)} />
      </div>
      {outputs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Outputs are uploaded when the job finishes.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {outputs.map(o => {
            const content = o.build();
            const Icon = o.key.endsWith('.json') ? FileJson : o.key.endsWith('.csv') ? Table2 : FileText;
            return (
              <div key={o.key} className="flex items-center gap-3 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{o.key}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(new Blob([content]).size / 1024).toFixed(1)} KB · {o.contentType}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => downloadText(`${job.id}-${o.key.split('/').pop()}`, content, o.contentType)}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Billed so far: {formatUsd(jobCost(job, now))}</p>
    </div>
  );
}

function Cli({ job }: { job: SimulationJob }) {
  const { state } = useRoboMaker();
  const app = state.robotApps.find(a => a.id === job.robotAppId);
  const world = state.worlds.find(w => w.id === job.worldId);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">The AWS CLI call that would launch this job on real RoboMaker:</p>
      <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
        {createSimulationJobCli({
          robotAppArn: app?.arn ?? `arn:aws:robomaker:::robot-application/${job.robotAppId}`,
          robotAppVersion: job.robotAppVersion,
          worldArn: world?.arn ?? `arn:aws:robomaker:::world/${job.worldId}`,
          algorithm: job.algorithm,
          start: job.start,
          goal: job.goal,
          maxJobDurationInSeconds: job.maxJobDurationInSeconds,
          failureBehavior: job.failureBehavior,
          realTimeFactor: job.realTimeFactor,
          tags: job.tags,
        })}
      </pre>
    </div>
  );
}

const LEVEL_STYLES: Record<LogLevel, string> = { INFO: 'text-sky-300', WARN: 'text-amber-300', ERROR: 'text-red-400' };

function LogViewer({ job }: { job: SimulationJob }) {
  const [query, setQuery] = useState('');
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logs = job.logs.filter(l => !query || l.message.toLowerCase().includes(query.toLowerCase()) || l.level === query.toUpperCase());

  useEffect(() => {
    if (follow && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs.length, follow, job.id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>
            Log group <span className="font-mono text-foreground">{LOG_GROUP}</span>
          </p>
          <p>
            Log stream <span className="font-mono text-foreground">{logStreamName(job)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter events or INFO / WARN / ERROR" className="h-8 w-full text-xs md:w-72" />
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={follow} onCheckedChange={setFollow} /> Tail
          </label>
        </div>
      </div>
      <div ref={scrollRef} className="h-[360px] overflow-y-auto rounded-md border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No matching events.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex gap-3 rounded px-1 hover:bg-white/[0.03]">
              <span className="shrink-0 text-muted-foreground">{new Date(l.t).toLocaleTimeString([], { hour12: false })}</span>
              <span className={cn('w-10 shrink-0', LEVEL_STYLES[l.level])}>{l.level}</span>
              <span className="break-all text-zinc-300">{l.message}</span>
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">{job.logs.length} events</p>
    </div>
  );
}
