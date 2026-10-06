'use client';

import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobStatus, SimulationJob } from '@/lib/robomaker/types';

export function SectionHeader({ icon, title, subtitle, apis }: { icon: string; title: string; subtitle: string; apis?: string[] }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <h2 className="font-heading text-3xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {apis && (
        <div className="flex flex-wrap gap-2">
          {apis.map(api => (
            <code key={api} className="rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] text-primary/90">
              {api}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-border bg-gradient-to-br from-background via-background to-primary/5 p-6', className)}>
      {children}
    </div>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs uppercase tracking-[1.5px] text-muted-foreground mb-2">
      {children}
    </label>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold mb-1">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function CopyText({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={cn('group inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground', className)}
      title="Copy"
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-green-500" /> : <Copy className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />}
    </button>
  );
}

const STATUS_STYLES: Record<JobStatus, { className: string; pulse?: boolean }> = {
  Pending: { className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  Preparing: { className: 'bg-sky-500/15 text-sky-300 border-sky-500/30', pulse: true },
  Running: { className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', pulse: true },
  RunningFailed: { className: 'bg-orange-500/15 text-orange-300 border-orange-500/30', pulse: true },
  Terminating: { className: 'bg-orange-500/15 text-orange-300 border-orange-500/30', pulse: true },
  Completed: { className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  Failed: { className: 'bg-red-500/15 text-red-300 border-red-500/40' },
  Terminated: { className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
};

export function StatusBadge({ job }: { job: Pick<SimulationJob, 'status' | 'goalReached'> }) {
  const goalMissed = job.status === 'Completed' && job.goalReached === false;
  const style = goalMissed ? { className: 'bg-amber-500/15 text-amber-300 border-amber-500/40' } : STATUS_STYLES[job.status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', style.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', 'pulse' in style && style.pulse && 'animate-pulse')} />
      {goalMissed ? 'Completed · goal missed' : job.status}
    </span>
  );
}

/** Tiny Markdown renderer for AI output: headings, bullets and **bold**. */
export function SimpleMarkdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {text.split('\n').map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith('#')) {
          return (
            <h4 key={i} className="pt-3 font-heading text-base font-bold text-foreground first:pt-0">
              {t.replace(/^#+\s*/, '')}
            </h4>
          );
        }
        if (/^[-*]\s/.test(t)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-primary">•</span>
              <p>{inline(t.slice(2))}</p>
            </div>
          );
        }
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.round(seconds % 60)}s`;
}

export function timeAgo(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}
