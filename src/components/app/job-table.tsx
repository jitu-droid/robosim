'use client';

import { jobProgress, jobSimSeconds } from '@/lib/robomaker/engine';
import type { SimulationJob } from '@/lib/robomaker/types';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { AlgorithmTag, formatDuration, StatusBadge, timeAgo } from './shared';

/** Console-style job list. Rows open the job detail page. */
export default function JobTable({ jobs, now, compact, actions }: { jobs: SimulationJob[]; now: number; compact?: boolean; actions?: (job: SimulationJob) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', !compact && 'min-w-[800px]')}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 pl-4 font-medium">Name</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Planner</th>
            {!compact && <th className="px-3 py-2.5 font-medium">World</th>}
            <th className="px-3 py-2.5 font-medium">Progress</th>
            {!compact && <th className="px-3 py-2.5 font-medium">Sim time</th>}
            <th className="px-3 py-2.5 font-medium">Created</th>
            {actions && <th className="px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => {
            const progress = jobProgress(job, now) * 100;
            return (
              <tr
                key={job.id}
                onClick={() => navigate({ view: 'job', id: job.id })}
                className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
              >
                <td className="max-w-[200px] px-3 py-3 first:pl-4">
                  <p className="truncate font-medium">{job.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{job.id}</p>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge job={job} />
                </td>
                <td className="px-3 py-3">
                  <AlgorithmTag algorithm={job.algorithm} />
                </td>
                {!compact && <td className="max-w-[160px] truncate px-3 py-3 text-muted-foreground">{job.worldName}</td>}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full transition-[width] duration-200', job.status === 'Failed' ? 'bg-red-400' : 'bg-primary')}
                        style={{ width: `${job.status === 'Failed' ? 100 : progress}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{job.status === 'Failed' ? '—' : `${progress.toFixed(0)}%`}</span>
                  </div>
                </td>
                {!compact && (
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tabular-nums">
                    {formatDuration(Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds))}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{timeAgo(job.createdAt, now)}</td>
                {actions && (
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">{actions(job)}</div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
