'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ALGORITHM_COLORS, ALGORITHM_LABELS, type Algorithm, type JobStatus, type SimulationJob } from '@/lib/robomaker/types';

type Icon = ComponentType<{ className?: string }>;

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2 text-xs text-muted-foreground">{breadcrumb}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border border-border bg-card', className)}>{children}</div>;
}

export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatTile({ label, value, sub, icon: IconCmp }: { label: string; value: ReactNode; sub?: ReactNode; icon?: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {IconCmp && <IconCmp className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground/90">
        {children}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-destructive">{children}</p>;
}

export function EmptyState({ icon: IconCmp, title, children, action }: { icon: Icon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <IconCmp className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CopyText({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={cn('group inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground', className)}
      title="Copy to clipboard"
    >
      <span className="truncate">{text}</span>
      {copied ? <Check className="h-3 w-3 shrink-0 text-emerald-400" /> : <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

const STATUS_STYLES: Record<JobStatus, { className: string; live?: boolean }> = {
  Pending: { className: 'text-zinc-300 bg-zinc-500/10 ring-zinc-500/25' },
  Preparing: { className: 'text-sky-300 bg-sky-500/10 ring-sky-500/25', live: true },
  Running: { className: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25', live: true },
  RunningFailed: { className: 'text-orange-300 bg-orange-500/10 ring-orange-500/25', live: true },
  Terminating: { className: 'text-orange-300 bg-orange-500/10 ring-orange-500/25', live: true },
  Completed: { className: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25' },
  Failed: { className: 'text-red-300 bg-red-500/10 ring-red-500/25' },
  Terminated: { className: 'text-zinc-400 bg-zinc-500/10 ring-zinc-500/20' },
};

export function StatusBadge({ job }: { job: Pick<SimulationJob, 'status' | 'goalReached'> }) {
  const goalMissed = job.status === 'Completed' && job.goalReached === false;
  const style = goalMissed ? { className: 'text-amber-300 bg-amber-500/10 ring-amber-500/25', live: false } : STATUS_STYLES[job.status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', style.className)}>
      <span className="relative flex h-1.5 w-1.5">
        {style.live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {goalMissed ? 'Completed (goal missed)' : job.status}
    </span>
  );
}

export function AlgorithmTag({ algorithm, className }: { algorithm: Algorithm; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: ALGORITHM_COLORS[algorithm] }} />
      {ALGORITHM_LABELS[algorithm]}
    </span>
  );
}

/** Wraps an action in a confirmation dialog. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={cn(destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Tiny Markdown renderer for AI output: headings, bullets and **bold**. */
export function SimpleMarkdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-medium text-foreground">
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
            <h4 key={i} className="pt-3 text-sm font-semibold text-foreground first:pt-0">
              {t.replace(/^#+\s*/, '')}
            </h4>
          );
        }
        if (/^[-*]\s/.test(t)) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
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
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
