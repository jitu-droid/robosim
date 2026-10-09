'use client';

import { useState } from 'react';
import { Dices, Globe, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useRoboMaker } from '@/lib/robomaker/store';
import type { SimulationWorld, WorldSize, WorldTemplateId } from '@/lib/robomaker/types';
import { WORLD_SIZES, WORLD_TEMPLATES } from '@/lib/robomaker/worlds';
import { cn } from '@/lib/utils';
import { TEMPLATE_ICONS } from './job-helpers';
import { Card, CardHeader, ConfirmDialog, EmptyState, FieldError, FieldLabel, PageHeader, plural } from './shared';
import WorldMap from './world-map';

export default function WorldsView() {
  const { state, startWorldGeneration, deleteWorld } = useRoboMaker();
  const { toast } = useToast();

  const [templateId, setTemplateId] = useState<WorldTemplateId>('warehouse');
  const [size, setSize] = useState<WorldSize>('medium');
  const [density, setDensity] = useState(0.4);
  const [count, setCount] = useState('3');
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 10000)));
  const [toDelete, setToDelete] = useState<SimulationWorld | null>(null);

  const template = WORLD_TEMPLATES.find(t => t.id === templateId)!;
  const countNum = Number(count);
  const seedNum = Number(seed);
  const countError = Number.isInteger(countNum) && countNum >= 1 && countNum <= 10 ? null : 'Between 1 and 10';
  const seedError = Number.isInteger(seedNum) && seedNum >= 0 ? null : 'Whole number, 0 or more';
  const running = state.worldJobs.filter(j => j.status === 'Pending' || j.status === 'Running');

  const generate = () => {
    if (countError || seedError) return;
    const job = startWorldGeneration({ templateId, size, density, seed: seedNum, count: countNum });
    toast({ title: 'World generation job started', description: `${job.id}: ${plural(countNum, 'world')} from ${template.name}` });
    setSeed(String(seedNum + countNum));
  };

  return (
    <>
      <PageHeader
        title="WorldForge worlds"
        description="Generate simulation worlds from templates. A world generation job creates several variations at once, and the same seed always produces the same layout."
      />

      <Card className="mb-8">
        <CardHeader title="Create world generation job" description="Equivalent to CreateWorldTemplate + CreateWorldGenerationJob" />
        <div className="space-y-6 p-5">
          <div>
            <FieldLabel>Template</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {WORLD_TEMPLATES.map(t => {
                const Icon = TEMPLATE_ICONS[t.id];
                const selected = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      selected ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/40 hover:bg-accent/40'
                    )}
                  >
                    <Icon className={cn('mb-2 h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Floor size</FieldLabel>
              <Select value={size} onValueChange={v => setSize(v as WorldSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WORLD_SIZES) as WorldSize[]).map(s => (
                    <SelectItem key={s} value={s}>
                      {WORLD_SIZES[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={cn(!template.usesDensity && 'pointer-events-none opacity-40')}>
              <FieldLabel hint={template.usesDensity ? `${Math.round(density * 100)}%` : 'Not used'}>Obstacle density</FieldLabel>
              <Slider value={[density]} min={0} max={1} step={0.05} onValueChange={([v]) => setDensity(v)} className="py-3" />
            </div>
            <div>
              <FieldLabel htmlFor="world-count">Number of worlds</FieldLabel>
              <Input id="world-count" type="number" min={1} max={10} value={count} onChange={e => setCount(e.target.value)} />
              <FieldError>{countError}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="world-seed">Seed</FieldLabel>
              <div className="flex gap-2">
                <Input id="world-seed" type="number" value={seed} onChange={e => setSeed(e.target.value)} />
                <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label="Random seed" onClick={() => setSeed(String(Math.floor(Math.random() * 10000)))}>
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              <FieldError>{seedError}</FieldError>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <Button onClick={generate} disabled={!!countError || !!seedError}>
              Generate {countError ? '' : plural(countNum, 'world')}
            </Button>
            {running.map(j => (
              <span key={j.id} className="inline-flex items-center gap-2 text-xs text-sky-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-mono">{j.id}</span> generating {plural(j.count, 'world')}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Worlds</h2>
        <span className="text-xs text-muted-foreground">{plural(state.worlds.length, 'world')}</span>
      </div>
      {state.worlds.length === 0 ? (
        <EmptyState icon={Globe} title="No worlds yet">
          Generate worlds from a template above.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {[...state.worlds].reverse().map(w => {
            const Icon = TEMPLATE_ICONS[w.templateId];
            const jobs = state.jobs.filter(j => j.worldId === w.id).length;
            return (
              <Card key={w.id} className="group overflow-hidden">
                <div className="p-2">
                  <WorldMap world={w} />
                </div>
                <div className="flex items-start justify-between gap-2 border-t border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{w.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.width}×{w.height} m · {w.obstacles.length} obstacles · {plural(jobs, 'job')}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${w.name}`}
                    className="rounded p-1 text-muted-foreground transition-opacity hover:bg-accent hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => setToDelete(w)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description="Jobs that already ran keep their results, but they can no longer be shown in the 3D viewer."
        confirmLabel="Delete world"
        destructive
        onConfirm={() => toDelete && deleteWorld(toDelete.id)}
      />
    </>
  );
}
