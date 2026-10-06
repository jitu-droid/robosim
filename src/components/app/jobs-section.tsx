'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Eye, Layers, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { createSimulationJobCli, parseTags } from '@/lib/robomaker/cli';
import { ACCOUNT_CONCURRENCY_LIMIT, jobProgress, jobSimSeconds } from '@/lib/robomaker/engine';
import { useNow, useRoboMaker, type JobInput } from '@/lib/robomaker/store';
import {
  ACTIVE_STATUSES,
  ALGORITHM_COLORS,
  ALGORITHM_LABELS,
  TERMINAL_STATUSES,
  type Algorithm,
  type FailureBehavior,
  type JobStatus,
  type Point,
} from '@/lib/robomaker/types';
import { defaultStartGoal, obstacleSet } from '@/lib/robomaker/worlds';
import { cn } from '@/lib/utils';
import { EmptyState, FieldLabel, formatDuration, Panel, SectionHeader, StatusBadge, timeAgo } from './shared';
import WorldMap from './world-map';

const ALGORITHMS: Algorithm[] = ['astar', 'rrt', 'potentialField'];
const FILTERS: { label: string; match: (s: JobStatus) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Active', match: s => s === 'Pending' || ACTIVE_STATUSES.includes(s) },
  { label: 'Completed', match: s => s === 'Completed' },
  { label: 'Failed', match: s => s === 'Failed' },
  { label: 'Terminated', match: s => s === 'Terminated' },
];

function scrollToViewer() {
  document.getElementById('simulation')?.scrollIntoView({ behavior: 'smooth' });
}

export default function JobsSection() {
  const rm = useRoboMaker();
  const { state } = rm;
  const { toast } = useToast();
  const now = useNow(250);

  const [name, setName] = useState('');
  const [robotAppId, setRobotAppId] = useState('');
  const [worldId, setWorldId] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('astar');
  const [start, setStart] = useState<Point | null>(null);
  const [goal, setGoal] = useState<Point | null>(null);
  const [pickMode, setPickMode] = useState<'start' | 'goal'>('start');
  const [maxDuration, setMaxDuration] = useState('120');
  const [rtf, setRtf] = useState('2');
  const [failureBehavior, setFailureBehavior] = useState<FailureBehavior>('Fail');
  const [tagsText, setTagsText] = useState('project=da3, team=robotics');
  const [showCli, setShowCli] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [filter, setFilter] = useState(0);

  // Default the selects to existing resources, and recover if one is deleted.
  useEffect(() => {
    if (!state.robotApps.some(a => a.id === robotAppId)) setRobotAppId(state.robotApps[0]?.id ?? '');
  }, [state.robotApps, robotAppId]);
  useEffect(() => {
    if (!state.worlds.some(w => w.id === worldId)) setWorldId(state.worlds[0]?.id ?? '');
  }, [state.worlds, worldId]);

  const world = state.worlds.find(w => w.id === worldId);
  const app = state.robotApps.find(a => a.id === robotAppId);

  useEffect(() => {
    if (!world) return;
    const d = defaultStartGoal(world);
    setStart(d.start);
    setGoal(d.goal);
    setPickMode('start');
  }, [world]);

  const blocked = useMemo(() => (world ? obstacleSet(world) : new Set<string>()), [world]);
  const durationNum = Number(maxDuration);
  const durationValid = Number.isInteger(durationNum) && durationNum >= 10 && durationNum <= 3600;
  const ready = !!app && !!world && !!start && !!goal && durationValid && !(start.x === goal.x && start.y === goal.y);

  const baseInput = (overrides: Partial<JobInput> = {}): JobInput => ({
    name,
    robotAppId,
    worldId,
    algorithm,
    start: start!,
    goal: goal!,
    maxJobDurationInSeconds: durationNum,
    failureBehavior,
    realTimeFactor: Number(rtf),
    tags: parseTags(tagsText),
    ...overrides,
  });

  const createJob = () => {
    if (!ready) return;
    const job = rm.createSimulationJob(baseInput());
    if (job) toast({ title: 'Simulation job created', description: job.id });
  };

  const benchmark = () => {
    if (!ready) return;
    const batch = rm.startSimulationJobBatch(
      `benchmark-${world!.name}`,
      ALGORITHMS.map(a => baseInput({ algorithm: a, name: `${name || app!.name}-${a}` })),
      3,
      'benchmark'
    );
    if (batch) {
      toast({ title: 'Benchmark started', description: 'A*, RRT and Potential Field are racing on the same world.' });
      scrollToViewer();
    }
  };

  const onCellClick = (cell: Point) => {
    if (blocked.has(`${cell.x},${cell.y}`)) {
      toast({ title: 'That cell is an obstacle', description: 'Pick a free (dark) cell.', variant: 'destructive' });
      return;
    }
    if (pickMode === 'start') {
      setStart(cell);
      setPickMode('goal');
    } else {
      setGoal(cell);
      setPickMode('start');
    }
  };

  const filteredJobs = state.jobs.filter(j => FILTERS[filter].match(j.status));
  const activeCount = state.jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
  const pendingCount = state.jobs.filter(j => j.status === 'Pending').length;

  return (
    <section id="jobs" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader
        icon="🚀"
        title="Simulation Jobs"
        subtitle="Run a robot application inside a world. Jobs queue, prepare, run and finish like real RoboMaker jobs."
        apis={['CreateSimulationJob', 'StartSimulationJobBatch', 'CancelSimulationJob']}
      />

      {state.robotApps.length === 0 || state.worlds.length === 0 ? (
        <EmptyState icon="🧩" title="You need a robot application and a world first">
          Create them in the <a className="text-primary underline" href="#robots">Robot Applications</a> and{' '}
          <a className="text-primary underline" href="#worlds">WorldForge</a> sections.
        </EmptyState>
      ) : (
        <Panel className="mb-10">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-5">
              <p className="font-semibold">Create simulation job</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Robot application</FieldLabel>
                  <Select value={robotAppId} onValueChange={setRobotAppId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select robot application" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.robotApps.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} (v{a.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>World</FieldLabel>
                  <Select value={worldId} onValueChange={setWorldId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select world" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.worlds.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.width}×{w.height})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Path planner</FieldLabel>
                  <Select value={algorithm} onValueChange={v => setAlgorithm(v as Algorithm)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALGORITHMS.map(a => (
                        <SelectItem key={a} value={a}>
                          {ALGORITHM_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="job-name">Job name (optional)</FieldLabel>
                  <Input id="job-name" value={name} onChange={e => setName(e.target.value)} placeholder={app ? `${app.name}-${algorithm}` : ''} />
                </div>
                <div>
                  <FieldLabel htmlFor="max-duration">Max job duration (s)</FieldLabel>
                  <Input id="max-duration" type="number" min={10} max={3600} value={maxDuration} onChange={e => setMaxDuration(e.target.value)} />
                  {!durationValid && <p className="mt-1 text-xs text-red-400">Whole seconds between 10 and 3600</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Real-time factor</FieldLabel>
                    <Select value={rtf} onValueChange={setRtf}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['1', '2', '5', '10'].map(v => (
                          <SelectItem key={v} value={v}>
                            {v}×
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>On failure</FieldLabel>
                    <Select value={failureBehavior} onValueChange={v => setFailureBehavior(v as FailureBehavior)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fail">Fail</SelectItem>
                        <SelectItem value="Continue">Continue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="job-tags">Tags (key=value, comma separated)</FieldLabel>
                  <Input id="job-tags" value={tagsText} onChange={e => setTagsText(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={createJob} disabled={!ready} className="flex-1 bg-foreground py-6 font-bold text-background hover:bg-white/80">
                  🚀 Create job
                </Button>
                <Button onClick={benchmark} disabled={!ready} className="flex-1 bg-primary py-6 font-bold hover:bg-primary/90" title="RoboSim enhancement">
                  🏁 Benchmark all 3 planners
                </Button>
                <Button onClick={() => setBatchOpen(true)} disabled={!app || !durationValid} variant="outline" className="flex-1 py-6">
                  <Layers className="mr-2 h-4 w-4" /> Batch over worlds
                </Button>
              </div>

              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setShowCli(s => !s)}>
                {showCli ? 'Hide' : 'Show'} equivalent AWS CLI command
              </button>
              {showCli && app && world && start && goal && (
                <pre className="overflow-x-auto rounded-md border border-border bg-black/60 p-4 text-[11px] leading-relaxed text-emerald-300">
                  {createSimulationJobCli({
                    robotAppArn: app.arn,
                    robotAppVersion: app.version,
                    worldArn: world.arn,
                    algorithm,
                    start,
                    goal,
                    maxJobDurationInSeconds: durationNum,
                    failureBehavior,
                    realTimeFactor: Number(rtf),
                    tags: parseTags(tagsText),
                  })}
                </pre>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <FieldLabel>Start &amp; goal</FieldLabel>
                <div className="flex gap-1 text-xs">
                  {(['start', 'goal'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPickMode(m)}
                      className={cn(
                        'rounded-full border px-3 py-1 capitalize',
                        pickMode === m ? (m === 'start' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-emerald-500 bg-emerald-500/20 text-emerald-300') : 'border-border text-muted-foreground'
                      )}
                    >
                      Set {m}
                    </button>
                  ))}
                </div>
              </div>
              {world && <WorldMap world={world} start={start ?? undefined} goal={goal ?? undefined} onCellClick={onCellClick} />}
              <p className="mt-2 text-xs text-muted-foreground">
                Click the map to place the <span className="text-blue-400">start ●</span> then the <span className="text-emerald-400">goal ●</span>.{' '}
                {start && goal && (
                  <span className="font-mono">
                    ({start.x}, {start.y}) → ({goal.x}, {goal.y})
                  </span>
                )}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {state.batches.length > 0 && (
        <div className="mb-6">
          <p className="section-title mb-3">Batches</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {state.batches.slice(0, 8).map(b => {
              const jobs = state.jobs.filter(j => j.batchId === b.id);
              const done = jobs.filter(j => TERMINAL_STATUSES.includes(j.status)).length;
              const running = jobs.some(j => !TERMINAL_STATUSES.includes(j.status));
              return (
                <div key={b.id} className="min-w-[240px] rounded-lg border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 font-semibold', b.kind === 'benchmark' ? 'bg-primary/20 text-primary' : 'bg-sky-500/20 text-sky-300')}>
                      {b.kind === 'benchmark' ? '🏁 Benchmark' : '📚 Batch'}
                    </span>
                    {running && (
                      <button type="button" className="text-muted-foreground hover:text-red-400" onClick={() => rm.cancelBatch(b.id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="mt-2 truncate font-mono text-muted-foreground">{b.id}</p>
                  <p className="truncate">{b.name}</p>
                  <Progress value={jobs.length ? (done / jobs.length) * 100 : 0} className="mt-2 h-1.5" />
                  <p className="mt-1 text-muted-foreground">
                    {done}/{jobs.length} finished · maxConcurrency {b.maxConcurrency}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(i)}
              className={cn('rounded-full border px-3 py-1 text-xs', filter === i ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {f.label} ({state.jobs.filter(j => f.match(j.status)).length})
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Concurrency: {activeCount}/{ACCOUNT_CONCURRENCY_LIMIT} active{pendingCount ? ` · ${pendingCount} queued` : ''}
        </p>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState icon="📋" title="No simulation jobs">
          {state.jobs.length ? 'Nothing matches this filter.' : 'Create a job or start a benchmark above.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-primary/5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Job</th>
                <th className="p-3">Status</th>
                <th className="p-3">Planner</th>
                <th className="p-3">World</th>
                <th className="p-3 w-40">Progress</th>
                <th className="p-3">Sim time</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map(job => {
                const progress = jobProgress(job, now) * 100;
                const selected = state.selectedJobId === job.id;
                const terminal = TERMINAL_STATUSES.includes(job.status);
                return (
                  <tr
                    key={job.id}
                    onClick={() => rm.selectJob(job.id)}
                    className={cn('cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/5', selected && 'bg-primary/10')}
                  >
                    <td className="p-3">
                      <p className="font-medium">{job.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {job.id}
                        {job.batchId && ' · batch'}
                      </p>
                    </td>
                    <td className="p-3">
                      <StatusBadge job={job} />
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: ALGORITHM_COLORS[job.algorithm] }} />
                        {ALGORITHM_LABELS[job.algorithm]}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{job.worldName}</td>
                    <td className="p-3">
                      <Progress value={progress} className="h-1.5" />
                      <p className="mt-1 text-[11px] text-muted-foreground">{progress.toFixed(0)}%</p>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {formatDuration(Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds))}
                      <span className="text-muted-foreground"> / {job.maxJobDurationInSeconds}s</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{timeAgo(job.createdAt, now)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View in simulator"
                          onClick={() => {
                            rm.selectJob(job.id);
                            scrollToViewer();
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Clone job"
                          onClick={() => {
                            const c = rm.cloneJob(job.id);
                            if (c) toast({ title: 'Job cloned', description: c.id });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!terminal ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancel job" disabled={job.status === 'Terminating'} onClick={() => rm.cancelJob(job.id)}>
                            <Square className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete job" onClick={() => rm.deleteJob(job.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BatchDialog open={batchOpen} onOpenChange={setBatchOpen} baseInput={baseInput} ready={!!app && durationValid} algorithm={algorithm} />
    </section>
  );
}

function BatchDialog({
  open,
  onOpenChange,
  baseInput,
  ready,
  algorithm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseInput: (o?: Partial<JobInput>) => JobInput;
  ready: boolean;
  algorithm: Algorithm;
}) {
  const rm = useRoboMaker();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(2);

  useEffect(() => {
    if (open) setSelected(rm.state.worlds.map(w => w.id));
  }, [open, rm.state.worlds]);

  const start = () => {
    const inputs = rm.state.worlds
      .filter(w => selected.includes(w.id))
      .map(w => {
        const sg = defaultStartGoal(w);
        return baseInput({ worldId: w.id, ...sg, name: `batch-${algorithm}-${w.name.replace(/\W+/g, '').toLowerCase()}` });
      });
    const batch = rm.startSimulationJobBatch(`${ALGORITHM_LABELS[algorithm]} across ${inputs.length} worlds`, inputs, concurrency, 'batch');
    if (batch) {
      toast({ title: 'Simulation job batch started', description: `${batch.id} · ${inputs.length} jobs · maxConcurrency ${concurrency}` });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start simulation job batch</DialogTitle>
          <DialogDescription>
            Runs the current robot application with {ALGORITHM_LABELS[algorithm]} on each selected world (start and goal are placed in opposite corners).
            This is the usual RoboMaker pattern of WorldForge plus batch testing.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
          {rm.state.worlds.map(w => (
            <label key={w.id} className="flex items-center gap-3 rounded border border-border p-2 text-sm">
              <Checkbox
                checked={selected.includes(w.id)}
                onCheckedChange={c => setSelected(s => (c ? [...s, w.id] : s.filter(x => x !== w.id)))}
              />
              <span className="flex-1">{w.name}</span>
              <span className="text-xs text-muted-foreground">
                {w.width}×{w.height}
              </span>
            </label>
          ))}
        </div>
        <div>
          <FieldLabel>maxConcurrency · {concurrency}</FieldLabel>
          <Slider value={[concurrency]} min={1} max={ACCOUNT_CONCURRENCY_LIMIT} step={1} onValueChange={([v]) => setConcurrency(v)} className="py-3" />
          <p className="text-xs text-muted-foreground">Jobs beyond this limit wait in Pending until a slot frees up.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={start} disabled={!ready || selected.length === 0} className="bg-primary">
            Start batch ({selected.length} jobs)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
