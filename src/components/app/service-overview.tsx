'use client';

import { SectionHeader } from './shared';

const WORKFLOW = [
  { step: '1', title: 'Robot application', body: 'Package the robot code (ROS / ROS 2) as a versioned robot application.', icon: '🤖', href: '#robots' },
  { step: '2', title: 'Simulation world', body: 'Generate worlds from templates with WorldForge, or bring your own Gazebo world.', icon: '🌍', href: '#worlds' },
  { step: '3', title: 'Simulation job', body: 'Launch a job (or a batch) that runs the robot inside the world on managed compute.', icon: '🚀', href: '#jobs' },
  { step: '4', title: 'Monitor', body: 'Watch the robot live, follow the job lifecycle and stream logs to CloudWatch.', icon: '📺', href: '#simulation' },
  { step: '5', title: 'Analyse outputs', body: 'Results and logs land in S3; metrics are compared across runs.', icon: '📊', href: '#analytics' },
];

const MAPPING = [
  ['Robot application (CreateRobotApplication, versions)', 'Robot Applications: name, robot type, ROS suite, speed/acceleration limits, publish versions'],
  ['Simulation application + world', 'Worlds: occupancy-grid environments rendered in 3D'],
  ['WorldForge templates and world generation jobs', 'WorldForge: 5 templates, size, density and seed; generation jobs create N world variations'],
  ['CreateSimulationJob', 'Job form: robot app, world, planner, start/goal, maxJobDurationInSeconds, failureBehavior, real-time factor, tags'],
  ['Job lifecycle', 'Pending → Preparing → Running → Completed / Failed, plus RunningFailed, Terminating and Terminated'],
  ['StartSimulationJobBatch', 'Batch runs over many worlds with maxConcurrency, plus an account-wide limit of 5 active jobs'],
  ['CancelSimulationJob', 'Cancel job or whole batch (Terminating → Terminated)'],
  ['CloudWatch Logs', 'Per-job log stream with live tail and filtering'],
  ['S3 output location', 'result.json, trajectory.csv and robot_application.log per job, downloadable'],
  ['Gazebo GUI', 'Three.js 3D viewer with orbit camera and live robot pose'],
  ['Simulation-unit billing', 'Cost explorer at $0.40 per SU-hour'],
];

const ENHANCEMENTS = [
  { icon: '🏁', title: 'Algorithm benchmark', body: 'One click runs A*, RRT and Potential Field on the same world and start/goal, then races all three robots in the 3D viewer and ranks them on each metric.' },
  { icon: '🧠', title: 'AI performance insights', body: 'Gemini (via Genkit) reads the results and explains which planner wins, why jobs failed and what to tune. A built-in rule-based analyser is used if no API key is set.' },
  { icon: '💰', title: 'Cost explorer', body: 'Estimates SU-hours and dollars per job and per algorithm, and projects the cost of 1,000 runs. RoboMaker only showed this on the monthly bill.' },
  { icon: '🧮', title: 'Planner metrics', body: 'Optimality vs. the A* shortest path, nodes expanded, energy, turns and obstacle clearance are recorded for every job.' },
];

export default function ServiceOverview() {
  return (
    <section id="service" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader icon="☁️" title="About AWS RoboMaker" subtitle="The AWS service this website simulates" />

      <div className="grid gap-8 lg:grid-cols-5 mb-12">
        <div className="lg:col-span-3 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">AWS RoboMaker</strong> was AWS&apos;s managed service for robotics development. Teams used it
            to test robot software in simulation instead of on physical hardware. It ran ROS / ROS 2 applications inside Gazebo worlds on
            AWS-managed compute, scaled to hundreds of parallel simulations, and used CloudWatch for logs and S3 for outputs.
          </p>
          <p>
            Typical uses were regression-testing navigation code on every commit, generating thousands of randomised worlds with
            <strong className="text-foreground"> WorldForge</strong> to find edge cases, and collecting training data for reinforcement
            learning (AWS DeepRacer was built on it).
          </p>
          <p className="text-xs border-l-2 border-primary/50 pl-3">
            AWS ended support for RoboMaker on 10 September 2025 and recommends AWS Batch for running simulations. RoboSim keeps its
            workflow alive as a teaching tool.
          </p>
        </div>
        <div className="lg:col-span-2 rounded-lg border border-border p-5">
          <p className="section-title">Key concepts</p>
          <dl className="space-y-3 text-sm">
            {[
              ['Robot application', 'Code that runs on the robot'],
              ['Simulation application', 'The world and simulator around it'],
              ['Simulation job', 'One run of both, with a max duration'],
              ['Simulation unit (SU)', '1 vCPU + 2 GB RAM, the billing unit'],
              ['WorldForge', 'Procedural world generation from templates'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                <dt className="text-foreground">{k}</dt>
                <dd className="text-right text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p className="section-title mb-4">Workflow</p>
      <div className="grid gap-3 md:grid-cols-5 mb-12">
        {WORKFLOW.map((w, i) => (
          <a key={w.step} href={w.href} className="group relative rounded-lg border border-border p-4 transition-colors hover:border-primary/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{w.icon}</span>
              <span className="font-mono text-xs text-muted-foreground">0{w.step}</span>
            </div>
            <p className="font-semibold mb-1 group-hover:text-primary">{w.title}</p>
            <p className="text-xs text-muted-foreground">{w.body}</p>
            {i < WORKFLOW.length - 1 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-primary md:block">→</span>}
          </a>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="section-title mb-4">How RoboSim maps to RoboMaker</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">RoboMaker</th>
                  <th className="p-3">RoboSim</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map(([aws, ours]) => (
                  <tr key={aws} className="border-t border-border/60 align-top">
                    <td className="p-3 font-medium">{aws}</td>
                    <td className="p-3 text-muted-foreground">{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="section-title mb-4">Enhancements beyond RoboMaker</p>
          <div className="grid gap-3">
            {ENHANCEMENTS.map(e => (
              <div key={e.title} className="flex gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <span className="text-2xl">{e.icon}</span>
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
