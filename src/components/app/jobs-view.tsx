'use client';

import { useState } from 'react';
import { Copy, Layers, Play, Plus, Search, Square, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ACCOUNT_CONCURRENCY_LIMIT } from '@/lib/robomaker/engine';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ACTIVE_STATUSES, TERMINAL_STATUSES, type JobStatus, type SimulationJob } from '@/lib/robomaker/types';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import JobTable from './job-table';
import { Card, CardHeader, EmptyState, PageHeader, plural } from './shared';

const FILTERS: { label: string; match: (s: JobStatus) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Active', match: s => s === 'Pending' || ACTIVE_STATUSES.includes(s) },
  { label: 'Completed', match: s => s === 'Completed' },
  { label: 'Failed', match: s => s === 'Failed' },
  { label: 'Terminated', match: s => s === 'Terminated' },
];

function IconAction({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('h-8 w-8', className)} aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function JobsView() {
  const rm = useRoboMaker();
  const { state } = rm;
  const { toast } = useToast();
  const now = useNow(250);
  const [filter, setFilter] = useState(0);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const jobs = state.jobs.filter(
    j => FILTERS[filter].match(j.status) && (!q || j.name.toLowerCase().includes(q) || j.id.includes(q) || j.worldName.toLowerCase().includes(q))
  );
  const activeCount = state.jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
  const pendingCount = state.jobs.filter(j => j.status === 'Pending').length;

  const actions = (job: SimulationJob) => (
    <>
      <IconAction
        label="Clone job"
        onClick={() => {
          const c = rm.cloneJob(job.id);
          if (c) toast({ title: 'Job cloned', description: c.id });
        }}
      >
        <Copy className="h-4 w-4" />
      </IconAction>
      {TERMINAL_STATUSES.includes(job.status) ? (
        <IconAction label="Delete job" className="hover:text-destructive" onClick={() => rm.deleteJob(job.id)}>
          <Trash2 className="h-4 w-4" />
        </IconAction>
      ) : (
        <IconAction label="Cancel job" className="hover:text-destructive" onClick={() => rm.cancelJob(job.id)}>
          <Square className="h-3.5 w-3.5" />
        </IconAction>
      )}
    </>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <PageHeader
        title="Simulation jobs"
        description="Each job runs a robot application inside a world. Jobs queue while capacity is full, then move through Preparing and Running to a final state."
        actions={
          <Button onClick={() => navigate({ view: 'new-job' })}>
            <Plus className="mr-1.5 h-4 w-4" /> Create simulation job
          </Button>
        }
      />

      {state.batches.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Batches" description="StartSimulationJobBatch and benchmark runs" />
          <div className="divide-y divide-border">
            {state.batches.slice(0, 6).map(b => {
              const batchJobs = state.jobs.filter(j => j.batchId === b.id);
              const done = batchJobs.filter(j => TERMINAL_STATUSES.includes(j.status)).length;
              const running = batchJobs.some(j => !TERMINAL_STATUSES.includes(j.status));
              const pct = batchJobs.length ? (done / batchJobs.length) * 100 : 0;
              const KindIcon = b.kind === 'benchmark' ? Trophy : Layers;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', b.kind === 'benchmark' ? 'bg-primary/15 text-primary' : 'bg-sky-500/10 text-sky-300')}>
                      <KindIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <button type="button" className="truncate text-left text-sm font-medium hover:underline" onClick={() => batchJobs[0] && navigate({ view: 'job', id: batchJobs[0].id })}>
                        {b.name}
                      </button>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {b.id} · {b.kind === 'benchmark' ? 'benchmark' : 'batch'} · maxConcurrency {b.maxConcurrency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-24 text-xs tabular-nums text-muted-foreground">
                      {done}/{batchJobs.length} finished
                    </span>
                    <Button variant="ghost" size="sm" className={cn('h-8 text-xs', !running && 'invisible')} onClick={() => rm.cancelBatch(b.id)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
          {FILTERS.map((f, i) => {
            const n = state.jobs.filter(j => f.match(j.status)).length;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setFilter(i)}
                className={cn('rounded px-2.5 py-1 text-xs transition-colors', filter === i ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {f.label} <span className="tabular-nums text-muted-foreground">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {activeCount}/{ACCOUNT_CONCURRENCY_LIMIT} active{pendingCount ? ` · ${pendingCount} queued` : ''}
          </span>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID or world" className="h-9 pl-8" />
          </div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Play}
          title={state.jobs.length ? 'No jobs match' : 'No simulation jobs yet'}
          action={
            !state.jobs.length && (
              <Button size="sm" onClick={() => navigate({ view: 'new-job' })}>
                Create simulation job
              </Button>
            )
          }
        >
          {state.jobs.length ? 'Try a different filter or search.' : 'Create a job, or benchmark all three planners at once.'}
        </EmptyState>
      ) : (
        <Card>
          <JobTable jobs={jobs} now={now} actions={actions} />
          <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{plural(jobs.length, 'job')}</p>
        </Card>
      )}
    </TooltipProvider>
  );
}
