'use client';

import AboutView from '@/components/app/about-view';
import AnalyticsView from '@/components/app/analytics-view';
import ConsoleShell from '@/components/app/console-shell';
import JobDetailView from '@/components/app/job-detail-view';
import JobsView from '@/components/app/jobs-view';
import NewJobView from '@/components/app/new-job-view';
import OverviewView from '@/components/app/overview-view';
import RobotsView from '@/components/app/robots-view';
import WorldsView from '@/components/app/worlds-view';
import { RoboMakerProvider, useRoboMaker } from '@/lib/robomaker/store';
import { useHashRoute, type Route } from '@/lib/router';

function CurrentView({ route }: { route: Route }) {
  const { hydrated } = useRoboMaker();
  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  switch (route.view) {
    case 'robots':
      return <RobotsView />;
    case 'worlds':
      return <WorldsView />;
    case 'jobs':
      return <JobsView />;
    case 'new-job':
      return <NewJobView />;
    case 'job':
      return <JobDetailView id={route.id!} />;
    case 'analytics':
      return <AnalyticsView />;
    case 'about':
      return <AboutView />;
    default:
      return <OverviewView />;
  }
}

export default function Home() {
  const route = useHashRoute();
  return (
    <RoboMakerProvider>
      <ConsoleShell route={route}>
        <CurrentView route={route} />
      </ConsoleShell>
    </RoboMakerProvider>
  );
}
