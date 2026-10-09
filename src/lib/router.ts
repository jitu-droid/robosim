'use client';

import { useEffect, useState } from 'react';

export type View = 'overview' | 'robots' | 'worlds' | 'jobs' | 'new-job' | 'job' | 'analytics' | 'about';

export interface Route {
  view: View;
  id?: string;
}

/** Parses hashes like #/jobs, #/jobs/new and #/jobs/sim-abc123. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'robots':
    case 'worlds':
    case 'analytics':
    case 'about':
      return { view: parts[0] };
    case 'jobs':
      if (parts[1] === 'new') return { view: 'new-job' };
      if (parts[1]) return { view: 'job', id: parts[1] };
      return { view: 'jobs' };
    default:
      return { view: 'overview' };
  }
}

export function href(route: Route): string {
  if (route.view === 'overview') return '#/';
  if (route.view === 'new-job') return '#/jobs/new';
  if (route.view === 'job') return `#/jobs/${route.id}`;
  return `#/${route.view}`;
}

export function navigate(route: Route) {
  window.location.hash = href(route);
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>({ view: 'overview' });
  useEffect(() => {
    const update = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
