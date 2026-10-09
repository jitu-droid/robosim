'use client';

import { Activity, ArrowRight, Bot, CheckCircle2, Circle, Globe, Play, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isFinished, isSuccess } from '@/lib/robomaker/insights';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ACTIVE_STATUSES } from '@/lib/robomaker/types';
import { href, navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { benchmarkInputs } from './job-helpers';
import JobTable from './job-table';
import { Card, CardHeader, EmptyState, PageHeader, StatTile } from './shared';

export default function OverviewView() {
  const rm = useRoboMaker();
  const { state } = rm;
  const { toast } = useToast();
  const now = useNow(500);

  const active = state.jobs.filter(j => j.status === 'Pending' || ACTIVE_STATUSES.includes(j.status)).length;
  const finished = state.jobs.filter(isFinished);
  const succeeded = finished.filter(isSuccess).length;

  const runDemoBenchmark = () => {
    const app = state.robotApps[0];
    const world = state.worlds[0];
    if (!app || !world) {
      toast({ title: 'Create a robot application and a world first', variant: 'destructive' });
      return;
    }
    const batch = rm.startSimulationJobBatch(`Benchmark on ${world.name}`, benchmarkInputs(app.id, world, { name: app.name }), 3, 'benchmark');
    if (batch) navigate({ view: 'job', id: batch.jobIds[0] });
  };

  const steps = [
    { done: state.robotApps.length > 0, title: 'Create a robot application', body: 'Register the software that runs on the robot.', to: href({ view: 'robots' }) },
    { done: state.worlds.length > 0, title: 'Generate a world', body: 'Use a WorldForge template to build test environments.', to: href({ view: 'worlds' }) },
    { done: state.jobs.length > 0, title: 'Run a simulation job', body: 'Launch the robot in a world and watch it in 3D.', to: href({ view: 'new-job' }) },
    { done: state.batches.some(b => b.kind === 'benchmark'), title: 'Benchmark the planners', body: 'Race A*, RRT and Potential Field on the same world.', to: href({ view: 'new-job' }) },
    { done: finished.length >= 3, title: 'Review analytics', body: 'Compare results, read AI insights and estimate cost.', to: href({ view: 'analytics' }) },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="RoboSim reproduces the AWS RoboMaker workflow in your browser: robot applications, WorldForge worlds, simulation jobs, logs and outputs, plus planner benchmarking, AI insights and cost estimates."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ view: 'new-job' })}>
              <Plus className="mr-1.5 h-4 w-4" /> Create simulation job
            </Button>
            <Button onClick={runDemoBenchmark}>
              <Trophy className="mr-1.5 h-4 w-4" /> Run demo benchmark
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Robot applications" value={state.robotApps.length} icon={Bot} sub="Registered" />
        <StatTile label="Worlds" value={state.worlds.length} icon={Globe} sub="Generated with WorldForge" />
        <StatTile label="Active jobs" value={active} icon={Activity} sub={`${state.jobs.length} jobs in total`} />
        <StatTile
          label="Success rate"
          value={finished.length ? `${Math.round((succeeded / finished.length) * 100)}%` : '—'}
          icon={CheckCircle2}
          sub={finished.length ? `${succeeded} of ${finished.length} reached the goal` : 'No finished jobs yet'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent simulation jobs"
            actions={
              <a href={href({ view: 'jobs' })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3 w-3" />
              </a>
            }
          />
          {state.jobs.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Play}
                title="No simulation jobs yet"
                action={
                  <Button size="sm" onClick={runDemoBenchmark}>
                    Run demo benchmark
                  </Button>
                }
              >
                The demo benchmark runs all three planners on the first world so you can see the full workflow in about 30 seconds.
              </EmptyState>
            </div>
          ) : (
            <JobTable jobs={state.jobs.slice(0, 6)} now={now} compact />
          )}
        </Card>

        <Card>
          <CardHeader title="Getting started" description="The RoboMaker workflow, step by step" />
          <ol className="divide-y divide-border">
            {steps.map((s, i) => (
              <li key={s.title}>
                <a href={s.to} className="group flex gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50">
                  {s.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', s.done && 'text-muted-foreground')}>
                      <span className="mr-1.5 tabular-nums text-muted-foreground">{i + 1}.</span>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.body}</p>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
