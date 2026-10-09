'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { BarChart3, BookOpen, Bot, Globe, LayoutDashboard, Menu, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ACCOUNT_ID, REGION } from '@/lib/robomaker/ids';
import { useRoboMaker } from '@/lib/robomaker/store';
import { ACTIVE_STATUSES } from '@/lib/robomaker/types';
import { href, type Route, type View } from '@/lib/router';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from './shared';

interface NavItem {
  view: View;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match: View[];
}

const NAV: { heading: string; items: NavItem[] }[] = [
  { heading: '', items: [{ view: 'overview', label: 'Overview', icon: LayoutDashboard, match: ['overview'] }] },
  {
    heading: 'Development',
    items: [
      { view: 'robots', label: 'Robot applications', icon: Bot, match: ['robots'] },
      { view: 'worlds', label: 'WorldForge worlds', icon: Globe, match: ['worlds'] },
    ],
  },
  {
    heading: 'Simulation',
    items: [{ view: 'jobs', label: 'Simulation jobs', icon: Play, match: ['jobs', 'new-job', 'job'] }],
  },
  {
    heading: 'Insights',
    items: [{ view: 'analytics', label: 'Analytics', icon: BarChart3, match: ['analytics'] }],
  },
  {
    heading: 'Learn',
    items: [{ view: 'about', label: 'About RoboMaker', icon: BookOpen, match: ['about'] }],
  },
];

function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Bot className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">RoboSim</span>
        <span className="block text-[11px] text-muted-foreground">RoboMaker simulator</span>
      </span>
    </a>
  );
}

function NavLinks({ route, onNavigate }: { route: Route; onNavigate?: () => void }) {
  const { state } = useRoboMaker();
  const active = state.jobs.filter(j => j.status === 'Pending' || ACTIVE_STATUSES.includes(j.status)).length;
  return (
    <nav className="space-y-5">
      {NAV.map(group => (
        <div key={group.heading || 'root'}>
          {group.heading && <p className="eyebrow mb-1.5 px-2">{group.heading}</p>}
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const selected = item.match.includes(route.view);
              return (
                <li key={item.view}>
                  <a
                    href={href({ view: item.view })}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                      selected ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', selected && 'text-primary')} />
                    <span className="flex-1">{item.label}</span>
                    {item.view === 'jobs' && active > 0 && (
                      <span className="rounded bg-emerald-500/15 px-1.5 text-[11px] font-medium tabular-nums text-emerald-300">{active}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function ConsoleShell({ route, children }: { route: Route; children: ReactNode }) {
  const { resetAll } = useRoboMaker();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <NavLinks route={route} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline">{REGION}</span>
          <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">Account {ACCOUNT_ID}</span>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset demo</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border px-3 py-6 lg:block">
          <NavLinks route={route} />
          <p className="mt-8 px-2 text-[11px] leading-relaxed text-muted-foreground">
            Educational simulation of AWS RoboMaker. Not affiliated with Amazon Web Services. Data is stored in this browser only.
          </p>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="This deletes every robot application, world and simulation job you created and restores the starting demo data."
        confirmLabel="Reset"
        destructive
        onConfirm={resetAll}
      />
    </div>
  );
}
