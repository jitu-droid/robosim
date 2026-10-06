
'use client';
import SimulationViewer from '@/components/app/simulation-viewer';

export default function SimulationSection() {

  return (
    <section id="simulation" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <div className="p-10">
        <SimulationViewer />
      </div>
    </section>
  );
}
