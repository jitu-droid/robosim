'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileJson, FileText, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSimulationJobCli } from '@/lib/robomaker/cli';
import { jobProgress, jobSimSeconds } from '@/lib/robomaker/engine';
import { LOG_GROUP } from '@/lib/robomaker/ids';
import { downloadText, jobOutputs, logStreamName, outputPrefix } from '@/lib/robomaker/outputs';
import { formatUsd, jobCost } from '@/lib/robomaker/pricing';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ALGORITHM_COLORS, ALGORITHM_LABELS, ROBOT_TYPE_LABELS, type LogLevel, type SimulationJob } from '@/lib/robomaker/types';
import { cn } from '@/lib/utils';
import { CopyText, EmptyState, formatDuration, Panel, SectionHeader, StatusBadge } from './shared';
import SimulationViewer, { currentPose } from './simulation-viewer';

export default function SimulationSection() {
  const { state, selectJob } = useRoboMaker();
  const now = useNow(150);
  const [overlay, setOverlay] = useState(true);

  // Follow the newest job when nothing is selected.
  useEffect(() => {
    if (!state.selectedJobId && state.jobs.length) selectJob(state.jobs[0].id);
  }, [state.selectedJobId, state.jobs, selectJob]);

  const job = state.jobs.find(j => j.id === state.selectedJobId);
  const world = job ? state.worlds.find(w => w.id === job.worldId) : undefined;
  const batch = job?.batchId ? state.batches.find(b => b.id === job.batchId) : undefined;
  const isBenchmark = batch?.kind === 'benchmark';
  const siblings = useMemo(
    () => (job && isBenchmark && overlay ? state.jobs.filter(j => j.batchId === job.batchId && j.id !== job.id && j.worldId === job.worldId) : []),
    [job, isBenchmark, overlay, state.jobs]
  );
  const viewerJobs = useMemo(() => (job ? [job, ...siblings] : []), [job, siblings]);

  return (
    <section id="simulation" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader
        icon="📺"
        title="Simulation Viewer"
        subtitle="Live 3D view of the selected job (the Gazebo GUI in RoboMaker). Drag to orbit; click, then scroll to zoom."
        apis={['DescribeSimulationJob', 'CloudWatch Logs', 'S3 output']}
      />

      {!job ? (
        <EmptyState icon="🎮" title="No job selected">
          Start a job in <a href="#jobs" className="text-primary underline">Simulation Jobs</a> and it will appear here.
        </EmptyState>
      ) : !world ? (
        <EmptyState icon="🌫️" title="World deleted">
          The world used by {job.id} no longer exists, so it can&apos;t be rendered.
        </EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-4">
            <div className="relative">
              <SimulationViewer world={world} jobs={viewerJobs} />
              <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-md border border-border bg-black/70 p-3 text-xs backdrop-blur">
                <div className="flex items-center gap-2">
                  <StatusBadge job={job} />
                  <span className="truncate font-semibold">{job.name}</span>
                </div>
                <p className="mt-1 font-mono text-muted-foreground">
                  {job.worldName} · RTF {job.realTimeFactor}×
                </p>
              </div>
              {viewerJobs.length > 1 && (
                <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-md border border-border bg-black/70 p-3 text-xs backdrop-blur">
                  <p className="font-semibold">🏁 Benchmark race</p>
                  {viewerJobs.map(j => (
                    <p key={j.id} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: ALGORITHM_COLORS[j.algorithm] }} />
                      {ALGORITHM_LABELS[j.algorithm]} — {j.status === 'Completed' && j.goalReached ? `finished in ${j.metrics!.simDuration.toFixed(1)}s` : j.status}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {isBenchmark && (
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <Switch checked={overlay} onCheckedChange={setOverlay} /> Show all benchmark planners on the same world
              </label>
            )}
            <Telemetry job={job} now={now} />
          </div>

          <Panel className="p-4">
            <JobDetails job={job} now={now} />
          </Panel>
        </div>
      )}
    </section>
  );
}

function Telemetry({ job, now }: { job: SimulationJob; now: number }) {
  const pose = currentPose(job, now);
  const sim = Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds);
  const m = job.metrics;
  const progress = jobProgress(job, now);
  const items = [
    { label: 'Simulation time', value: formatDuration(sim), sub: `limit ${job.maxJobDurationInSeconds}s` },
    { label: 'Speed', value: `${pose.speed.toFixed(2)} m/s`, sub: `max ${job.maxSpeed} m/s` },
    { label: 'Distance', value: `${pose.travelled.toFixed(1)} m`, sub: m ? `of ${m.pathLength.toFixed(1)} m` : 'no path yet' },
    { label: 'Pose', value: `(${pose.x.toFixed(1)}, ${pose.y.toFixed(1)})`, sub: `${((pose.heading * 180) / Math.PI).toFixed(0)}°` },
    { label: 'Energy', value: m ? `${(m.energy * progress).toFixed(0)} J` : '—', sub: m ? `est. total ${m.energy.toFixed(0)} J` : '' },
    { label: 'Cost so far', value: formatUsd(jobCost(job, now)), sub: `${job.simulationUnits} SU` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map(i => (
        <div key={i.label} className="rounded-lg border border-border bg-background/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.label}</p>
          <p className="font-mono text-lg font-semibold">{i.value}</p>
          <p className="text-[11px] text-muted-foreground">{i.sub}</p>
        </div>
      ))}
    </div>
  );
}

function JobDetails({ job, now }: { job: SimulationJob; now: number }) {
  const { state } = useRoboMaker();
  const m = job.metrics;
  const outputs = jobOutputs(job);
  const app = state.robotApps.find(a => a.id === job.robotAppId);
  const world = state.worlds.find(w => w.id === job.worldId);

  const rows: [string, string][] = [
    ['Robot application', `${job.robotAppName} v${job.robotAppVersion}`],
    ['Robot type', ROBOT_TYPE_LABELS[job.robotType]],
    ['World', job.worldName],
    ['Planner', ALGORITHM_LABELS[job.algorithm]],
    ['Start → goal', `(${job.start.x}, ${job.start.y}) → (${job.goal.x}, ${job.goal.y})`],
    ['Failure behavior', job.failureBehavior],
    ['Created', new Date(job.createdAt).toLocaleTimeString()],
  ];
  if (job.endedAt) rows.push(['Ended', new Date(job.endedAt).toLocaleTimeString()]);
  const tagEntries = Object.entries(job.tags);

  return (
    <Tabs defaultValue="details">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="outputs">S3</TabsTrigger>
        <TabsTrigger value="cli">CLI</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4 pt-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">ARN</p>
          <CopyText text={job.arn} />
        </div>
        {job.failureCode && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs">
            <p className="font-semibold text-red-300">{job.failureCode}</p>
            <p className="text-red-200/80">{job.failureReason}</p>
          </div>
        )}
        {job.status === 'Completed' && job.goalReached === false && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            maxJobDurationInSeconds was reached before the robot got to the goal. Try a longer duration or a higher real-time factor.
          </div>
        )}
        <dl className="space-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {tagEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagEntries.map(([k, v]) => (
              <span key={k} className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {k}={v}
              </span>
            ))}
          </div>
        )}
        {m && (
          <div>
            <p className="section-title mb-2">Planner metrics</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Path length', `${m.pathLength.toFixed(2)} m`],
                ['Optimality', m.optimality !== null ? `${m.optimality.toFixed(1)}%` : 'n/a'],
                ['Planning time', `${m.planningMs.toFixed(2)} ms`],
                ['Nodes expanded', m.nodesExpanded.toLocaleString()],
                ['Traverse time', `${m.simDuration.toFixed(1)} s`],
                ['Turns', String(m.turns)],
                ['Min clearance', `${m.minClearance.toFixed(2)} m`],
                ['Energy', `${m.energy.toFixed(0)} J`],
              ].map(([k, v]) => (
                <div key={k} className="rounded border border-border p-2">
                  <p className="text-muted-foreground">{k}</p>
                  <p className="font-mono font-semibold">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="logs" className="pt-2">
        <LogViewer job={job} />
      </TabsContent>

      <TabsContent value="outputs" className="space-y-3 pt-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Output location</p>
          <CopyText text={outputPrefix(job)} />
        </div>
        {outputs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Outputs are uploaded when the job finishes.</p>
        ) : (
          outputs.map(o => {
            const content = o.build();
            const Icon = o.key.endsWith('.json') ? FileJson : o.key.endsWith('.csv') ? Table2 : FileText;
            return (
              <div key={o.key} className="flex items-center gap-3 rounded-md border border-border p-3">
                <Icon className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{o.key}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(new Blob([content]).size / 1024).toFixed(1)} KB · {o.contentType}
                  </p>
                </div>
                <Button size="icon" variant="ghost" title="Download" onClick={() => downloadText(`${job.id}-${o.key.split('/').pop()}`, content, o.contentType)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
        <p className="text-[11px] text-muted-foreground">Billed so far: {formatUsd(jobCost(job, now))}</p>
      </TabsContent>

      <TabsContent value="cli" className="space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">The AWS CLI call that would launch this job on real RoboMaker:</p>
        <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-black/60 p-3 text-[10.5px] leading-relaxed text-emerald-300">
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
      </TabsContent>
    </Tabs>
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
    <div className="space-y-2">
      <div className="text-[11px] text-muted-foreground">
        <p>
          Log group <span className="font-mono text-foreground">{LOG_GROUP}</span>
        </p>
        <p>
          Stream <span className="font-mono text-foreground">{logStreamName(job)}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter events (text or INFO/WARN/ERROR)" className="h-8 text-xs" />
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Switch checked={follow} onCheckedChange={setFollow} className="scale-75" /> Tail
        </label>
      </div>
      <div ref={scrollRef} className="h-[380px] overflow-y-auto rounded-md border border-border bg-black/70 p-2 font-mono text-[10.5px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No matching events.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">{new Date(l.t).toLocaleTimeString([], { hour12: false })}</span>
              <span className={cn('w-10 shrink-0', LEVEL_STYLES[l.level])}>{l.level}</span>
              <span className="break-all text-zinc-200">{l.message}</span>
            </div>
          ))
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{job.logs.length} events</p>
    </div>
  );
}
