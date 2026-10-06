'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACCOUNT_ID, REGION } from '@/lib/robomaker/ids';
import { useRoboMaker } from '@/lib/robomaker/store';
import { ACTIVE_STATUSES } from '@/lib/robomaker/types';

export default function AppHeader() {
  const { state, resetAll } = useRoboMaker();
  const running = state.jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
  const completed = state.jobs.filter(j => j.status === 'Completed').length;

  const stats = [
    { label: 'Robot applications', value: state.robotApps.length },
    { label: 'Simulation worlds', value: state.worlds.length },
    { label: 'Active jobs', value: running },
    { label: 'Completed jobs', value: completed },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">SIM</span>
          <span className="font-semibold text-foreground">RoboSim Console</span>
          <span className="hidden sm:inline">· an unofficial AWS RoboMaker simulator</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded border border-border px-2 py-1 font-mono">{REGION}</span>
          <span className="hidden font-mono md:inline">Account {ACCOUNT_ID}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => {
              if (confirm('Reset all robot applications, worlds and jobs to the demo data?')) resetAll();
            }}
          >
            <RotateCcw className="h-3 w-3" /> Reset demo
          </Button>
        </div>
      </div>

      <header id="home" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
        <div className="relative">
          <p className="section-title flex items-center gap-2" data-animate>
            <span className="inline-block w-12 h-[2px] bg-primary"></span>
            AWS RoboMaker · Service Simulation
          </p>
          <h1 className="super-heading text-4xl sm:text-5xl md:text-6xl" data-animate>
            Build, simulate and{' '}
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">benchmark</span>{' '}
            robots in the cloud
          </h1>
          <p className="sub-heading" data-animate>
            RoboSim recreates the core workflow of AWS RoboMaker: register robot applications, generate worlds with WorldForge, run simulation
            jobs and batches, stream CloudWatch-style logs and collect S3 outputs. It also adds algorithm benchmarking, AI insights and a cost
            explorer on top.
          </p>
          <div className="flex flex-wrap gap-3 mb-12" data-animate>
            <Button asChild className="bg-primary px-6 hover:bg-primary/90">
              <a href="#jobs">Start a simulation job →</a>
            </Button>
            <Button asChild variant="outline" className="px-6">
              <a href="#service">How RoboMaker works</a>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-animate>
            {stats.map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-background/60 p-4">
                <p className="font-heading text-3xl font-bold">{s.value}</p>
                <p className="text-[11px] uppercase tracking-[1.5px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-20 -left-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>
        </div>
      </header>
    </>
  );
}
