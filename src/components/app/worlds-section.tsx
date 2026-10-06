'use client';

import { useState } from 'react';
import { Dices, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useRoboMaker } from '@/lib/robomaker/store';
import type { WorldSize, WorldTemplateId } from '@/lib/robomaker/types';
import { WORLD_SIZES, WORLD_TEMPLATES } from '@/lib/robomaker/worlds';
import { cn } from '@/lib/utils';
import { EmptyState, FieldLabel, Panel, SectionHeader } from './shared';
import WorldMap from './world-map';

export default function WorldsSection() {
  const { state, startWorldGeneration, deleteWorld } = useRoboMaker();
  const { toast } = useToast();

  const [templateId, setTemplateId] = useState<WorldTemplateId>('warehouse');
  const [size, setSize] = useState<WorldSize>('medium');
  const [density, setDensity] = useState(0.4);
  const [count, setCount] = useState('3');
  const [seed, setSeed] = useState(() => String(Math.floor(Math.random() * 10000)));

  const template = WORLD_TEMPLATES.find(t => t.id === templateId)!;
  const countNum = Number(count);
  const seedNum = Number(seed);
  const valid = Number.isInteger(countNum) && countNum >= 1 && countNum <= 10 && Number.isInteger(seedNum) && seedNum >= 0;
  const runningJobs = state.worldJobs.filter(j => j.status === 'Pending' || j.status === 'Running');

  const generate = () => {
    if (!valid) return;
    const job = startWorldGeneration({ templateId, size, density, seed: seedNum, count: countNum });
    toast({ title: 'World generation job started', description: `${job.id} — ${countNum} × ${template.name}` });
    setSeed(String(seedNum + countNum));
  };

  return (
    <section id="worlds" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader
        icon="🌍"
        title="WorldForge"
        subtitle="Generate simulation worlds from templates. Each seed gives a different but reproducible layout."
        apis={['CreateWorldTemplate', 'CreateWorldGenerationJob', 'DeleteWorld']}
      />

      <Panel className="mb-8">
        <p className="font-semibold mb-4">1 · Choose a world template</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
          {WORLD_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={cn(
                'rounded-lg border p-4 text-left transition-all',
                templateId === t.id ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border hover:border-primary/40'
              )}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">{t.description}</p>
            </button>
          ))}
        </div>

        <p className="font-semibold mb-4">2 · Configure the generation job</p>
        <div className="grid gap-6 md:grid-cols-4 items-end">
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
          <div className={cn(!template.usesDensity && 'opacity-40 pointer-events-none')}>
            <FieldLabel>Obstacle density · {Math.round(density * 100)}%</FieldLabel>
            <Slider value={[density]} min={0} max={1} step={0.05} onValueChange={([v]) => setDensity(v)} className="py-3" />
          </div>
          <div>
            <FieldLabel htmlFor="world-count">Worlds to generate (1–10)</FieldLabel>
            <Input id="world-count" type="number" min={1} max={10} value={count} onChange={e => setCount(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor="world-seed">Seed</FieldLabel>
            <div className="flex gap-2">
              <Input id="world-seed" type="number" value={seed} onChange={e => setSeed(e.target.value)} />
              <Button type="button" variant="outline" size="icon" title="Random seed" onClick={() => setSeed(String(Math.floor(Math.random() * 10000)))}>
                <Dices className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <Button onClick={generate} disabled={!valid} className="mt-6 w-full bg-foreground py-6 font-bold text-background hover:bg-white/80">
          🌐 Generate {valid ? countNum : ''} world{countNum === 1 ? '' : 's'}
        </Button>
        {runningJobs.length > 0 && (
          <div className="mt-4 space-y-1">
            {runningJobs.map(j => (
              <p key={j.id} className="flex items-center gap-2 text-xs text-sky-300">
                <Loader2 className="h-3 w-3 animate-spin" /> {j.id}: generating {j.count} world{j.count === 1 ? '' : 's'}…
              </p>
            ))}
          </div>
        )}
      </Panel>

      {state.worlds.length === 0 ? (
        <EmptyState icon="🌍" title="No worlds yet">
          Generate a world above.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[...state.worlds].reverse().map(w => {
            const t = WORLD_TEMPLATES.find(x => x.id === w.templateId);
            return (
              <div key={w.id} className="group rounded-lg border border-border p-3 transition-colors hover:border-primary/40">
                <WorldMap world={w} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {t?.icon} {w.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {w.width}×{w.height} m · {w.obstacles.length} obstacles
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Delete world"
                    className="text-muted-foreground transition-opacity hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => {
                      if (confirm(`Delete ${w.name}?`)) deleteWorld(w.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
