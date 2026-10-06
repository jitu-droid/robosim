'use client';
import AppHeader from '@/components/app/header';
import AppNav from '@/components/app/app-nav';
import ServiceOverview from '@/components/app/service-overview';
import RobotsSection from '@/components/app/robots-section';
import WorldsSection from '@/components/app/worlds-section';
import JobsSection from '@/components/app/jobs-section';
import SimulationSection from '@/components/app/simulation-section';
import AnalyticsSection from '@/components/app/analytics-section';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { RoboMakerProvider } from '@/lib/robomaker/store';

export default function Home() {
  useScrollAnimation();

  return (
    <RoboMakerProvider>
      <div className="max-w-7xl mx-auto [overflow-x:clip]">
        <AppHeader />
        <AppNav />
        <main>
          <ServiceOverview />
          <RobotsSection />
          <WorldsSection />
          <JobsSection />
          <SimulationSection />
          <AnalyticsSection />
        </main>
        <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
          RoboSim — an educational simulation of AWS RoboMaker built for BCSE355L Cloud Architecture Design. Not affiliated with or endorsed by
          Amazon Web Services. All data stays in your browser.
        </footer>
      </div>
    </RoboMakerProvider>
  );
}
