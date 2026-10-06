'use client';
import AppHeader from '@/components/app/header';
import AppNav from '@/components/app/app-nav';
import RobotsSection from '@/components/app/robots-section';
import PlanningSection from '@/components/app/planning-section';
import SimulationSection from '@/components/app/simulation-section';
import AnalyticsSection from '@/components/app/analytics-section';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';

export default function Home() {
  useScrollAnimation();

  return (
    <div className="max-w-7xl mx-auto">
      <AppHeader />
      <AppNav />
      <main>
        <RobotsSection />
        <PlanningSection />
        <SimulationSection />
        <AnalyticsSection />
      </main>
    </div>
  );
}
