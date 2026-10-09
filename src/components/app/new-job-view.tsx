'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Play, Terminal, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { createSimulationJobCli, parseTags } from '@/lib/robomaker/cli';
import { ACCOUNT_CONCURRENCY_LIMIT } from '@/lib/robomaker/engine';
import { useRoboMaker, type JobInput } from '@/lib/robomaker/store';
import { ALGORITHM_LABELS, type Algorithm, type FailureBehavior, type Point } from '@/lib/robomaker/types';
import { defaultStartGoal, obstacleSet } from '@/lib/robomaker/worlds';
import { href, navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { ALGORITHMS, benchmarkInputs } from './job-helpers';
import { AlgorithmTag, Card, CardHeader, EmptyState, FieldError, FieldLabel, PageHeader, plural } from './shared';
import WorldMap from './world-map';

const PLANNER_NOTES: Record<Algorithm, string> = {
  astar: 'Grid search. Always finds the shortest grid path if one exists.',
  rrt: 'Random tree in continuous space. Fast in open areas, paths are not optimal.',
  potentialField: 'Follows attractive and repulsive forces. Can get stuck behind walls.',
};

export default function NewJobView() {
  const rm = useRoboMaker();
  const { state } = rm;
  const { toast } = useToast();

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
  const durationError = Number.isInteger(durationNum) && durationNum >= 10 && durationNum <= 3600 ? null : 'Whole seconds between 10 and 3600';
  const sameCell = !!start && !!goal && start.x === goal.x && start.y === goal.y;
  const ready = !!app && !!world && !!start && !!goal && !durationError && !sameCell;

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
    if (job) {
      toast({ title: 'Simulation job created', description: job.id });
      navigate({ view: 'job', id: job.id });
    }
  };

  const benchmark = () => {
    if (!ready) return;
    const batch = rm.startSimulationJobBatch(
      `Benchmark on ${world!.name}`,
      benchmarkInputs(app!.id, world!, { ...baseInput(), name: name || app!.name }),
      3,
      'benchmark'
    );
    if (batch) navigate({ view: 'job', id: batch.jobIds[0] });
  };

  const onCellClick = (cell: Point) => {
    if (blocked.has(`${cell.x},${cell.y}`)) {
      toast({ title: 'That cell is an obstacle', description: 'Choose a free cell for the start and goal.', variant: 'destructive' });
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

  const breadcrumb = (
    <span className="inline-flex items-center gap-1">
      <a href={href({ view: 'jobs' })} className="hover:text-foreground">
        Simulation jobs
      </a>
      <ChevronRight className="h-3 w-3" /> Create
    </span>
  );

  if (!state.robotApps.length || !state.worlds.length) {
    return (
      <>
        <PageHeader title="Create simulation job" breadcrumb={breadcrumb} />
        <EmptyState icon={Play} title="You need a robot application and a world first">
          Create them under <a className="text-primary hover:underline" href={href({ view: 'robots' })}>Robot applications</a> and{' '}
          <a className="text-primary hover:underline" href={href({ view: 'worlds' })}>WorldForge worlds</a>.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Create simulation job"
        breadcrumb={breadcrumb}
        description="Equivalent to CreateSimulationJob. Pick the robot application and world, place the start and goal, then launch a single job or benchmark every planner."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Applications" />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div>
                <FieldLabel>Robot application</FieldLabel>
                <Select value={robotAppId} onValueChange={setRobotAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select robot application" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.robotApps.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} · v{a.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {app && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {app.softwareSuite} · {app.maxSpeed} m/s · {app.maxAcceleration} m/s²
                  </p>
                )}
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
                        <AlgorithmTag algorithm={a} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">{PLANNER_NOTES[algorithm]}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="World and route"
              description="Click the map to place the start, then the goal"
              actions={
                <div className="flex rounded-md border border-border p-0.5 text-xs">
                  {(['start', 'goal'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPickMode(m)}
                      className={cn('flex items-center gap-1.5 rounded px-2.5 py-1 capitalize', pickMode === m ? 'bg-accent text-foreground' : 'text-muted-foreground')}
                    >
                      <span className={cn('h-2 w-2 rounded-full', m === 'start' ? 'bg-blue-500' : 'bg-emerald-500')} />
                      Set {m}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="border-b border-border px-5 py-4">
              <FieldLabel>World</FieldLabel>
              <Select value={worldId} onValueChange={setWorldId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select world" />
                </SelectTrigger>
                <SelectContent>
                  {state.worlds.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} · {w.width}×{w.height} m · {w.obstacles.length} obstacles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="space-y-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Start
                    </dt>
                    <dd className="font-mono text-xs">{start ? `(${start.x}, ${start.y})` : '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Goal
                    </dt>
                    <dd className="font-mono text-xs">{goal ? `(${goal.x}, ${goal.y})` : '—'}</dd>
                  </div>
                  {start && goal && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Straight-line distance</dt>
                      <dd className="font-mono text-xs">{Math.hypot(goal.x - start.x, goal.y - start.y).toFixed(1)} m</dd>
                    </div>
                  )}
                </dl>
                <FieldError>{sameCell && 'Start and goal must be different cells'}</FieldError>
                {world && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = defaultStartGoal(world);
                      setStart(d.start);
                      setGoal(d.goal);
                    }}
                  >
                    Reset to opposite corners
                  </Button>
                )}
              </div>
              {world && <WorldMap world={world} start={start ?? undefined} goal={goal ?? undefined} onCellClick={onCellClick} className="border border-border" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Job configuration" />
            <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <FieldLabel htmlFor="job-name" hint="Optional">
                  Name
                </FieldLabel>
                <Input id="job-name" value={name} onChange={e => setName(e.target.value)} placeholder={app ? `${app.name}-${algorithm}` : ''} />
              </div>
              <div>
                <FieldLabel htmlFor="max-duration" hint="seconds">
                  Max job duration
                </FieldLabel>
                <Input id="max-duration" type="number" min={10} max={3600} value={maxDuration} onChange={e => setMaxDuration(e.target.value)} />
                <FieldError>{durationError}</FieldError>
              </div>
              <div>
                <FieldLabel>Real-time factor</FieldLabel>
                <Select value={rtf} onValueChange={setRtf}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '5', '10'].map(v => (
                      <SelectItem key={v} value={v}>
                        {v}× {v === '1' ? '(real time)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Failure behavior</FieldLabel>
                <Select value={failureBehavior} onValueChange={v => setFailureBehavior(v as FailureBehavior)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fail">Fail — stop the job</SelectItem>
                    <SelectItem value="Continue">Continue — keep running</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="job-tags" hint="key=value, comma separated">
                  Tags
                </FieldLabel>
                <Input id="job-tags" value={tagsText} onChange={e => setTagsText(e.target.value)} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Launch" />
            <div className="space-y-3 p-5">
              <Button onClick={createJob} disabled={!ready} className="w-full justify-start">
                <Play className="mr-2 h-4 w-4" /> Create job
                <span className="ml-auto text-xs opacity-70">{ALGORITHM_LABELS[algorithm]}</span>
              </Button>
              <Button onClick={benchmark} disabled={!ready} variant="secondary" className="w-full justify-start">
                <Trophy className="mr-2 h-4 w-4" /> Benchmark all planners
                <span className="ml-auto text-xs text-muted-foreground">3 jobs</span>
              </Button>
              <Button onClick={() => setBatchOpen(true)} disabled={!app || !!durationError} variant="outline" className="w-full justify-start">
                <Layers className="mr-2 h-4 w-4" /> Batch across worlds
                <span className="ml-auto text-xs text-muted-foreground">{plural(state.worlds.length, 'world')}</span>
              </Button>
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                The benchmark runs A*, RRT and Potential Field with identical settings so their results can be compared side by side. This is a RoboSim
                feature that RoboMaker did not offer.
              </p>
            </div>
          </Card>

          <Card>
            <button type="button" onClick={() => setShowCli(s => !s)} className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-semibold">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              Equivalent AWS CLI command
              <ChevronRight className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', showCli && 'rotate-90')} />
            </button>
            {showCli && app && world && start && goal && (
              <pre className="max-h-80 overflow-auto border-t border-border bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
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
          </Card>
        </div>
      </div>

      <BatchDialog open={batchOpen} onOpenChange={setBatchOpen} baseInput={baseInput} algorithm={algorithm} />
    </>
  );
}

function BatchDialog({
  open,
  onOpenChange,
  baseInput,
  algorithm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseInput: (o?: Partial<JobInput>) => JobInput;
  algorithm: Algorithm;
}) {
  const rm = useRoboMaker();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(2);

  useEffect(() => {
    if (open) setSelected(rm.state.worlds.map(w => w.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = () => {
    const inputs = rm.state.worlds
      .filter(w => selected.includes(w.id))
      .map(w => baseInput({ worldId: w.id, ...defaultStartGoal(w), name: `batch-${algorithm}-${w.name.replace(/\W+/g, '').toLowerCase()}` }));
    const batch = rm.startSimulationJobBatch(`${ALGORITHM_LABELS[algorithm]} across ${plural(inputs.length, 'world')}`, inputs, concurrency, 'batch');
    if (batch) {
      toast({ title: 'Simulation job batch started', description: `${plural(inputs.length, 'job')}, maxConcurrency ${concurrency}` });
      onOpenChange(false);
      navigate({ view: 'jobs' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start simulation job batch</DialogTitle>
          <DialogDescription>
            Runs the selected robot application with {ALGORITHM_LABELS[algorithm]} on each world, with start and goal in opposite corners. Generating
            many worlds with WorldForge and testing across all of them in one batch was the standard RoboMaker workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {rm.state.worlds.map(w => (
            <label key={w.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40">
              <Checkbox checked={selected.includes(w.id)} onCheckedChange={c => setSelected(s => (c ? [...s, w.id] : s.filter(x => x !== w.id)))} />
              <span className="flex-1">{w.name}</span>
              <span className="text-xs text-muted-foreground">
                {w.width}×{w.height} m
              </span>
            </label>
          ))}
        </div>
        <div>
          <FieldLabel hint={String(concurrency)}>maxConcurrency</FieldLabel>
          <Slider value={[concurrency]} min={1} max={ACCOUNT_CONCURRENCY_LIMIT} step={1} onValueChange={([v]) => setConcurrency(v)} className="py-3" />
          <p className="text-xs text-muted-foreground">Jobs beyond this limit wait in Pending until a slot frees up.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={start} disabled={selected.length === 0}>
            Start batch ({plural(selected.length, 'job')})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
