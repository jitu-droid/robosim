'use client';

import { BarChart3, Bot, Calculator, DollarSign, Globe, Info, MonitorPlay, Play, Sparkles, Trophy } from 'lucide-react';
import { href } from '@/lib/router';
import { Card, CardHeader, PageHeader } from './shared';

const WORKFLOW = [
  { title: 'Robot application', body: 'Package the robot code (ROS / ROS 2) as a versioned robot application.', icon: Bot, to: href({ view: 'robots' }) },
  { title: 'Simulation world', body: 'Generate worlds from templates with WorldForge, or bring your own Gazebo world.', icon: Globe, to: href({ view: 'worlds' }) },
  { title: 'Simulation job', body: 'Launch a job or a batch that runs the robot inside the world on managed compute.', icon: Play, to: href({ view: 'new-job' }) },
  { title: 'Monitor', body: 'Watch the robot live, follow the job lifecycle and stream logs to CloudWatch.', icon: MonitorPlay, to: href({ view: 'jobs' }) },
  { title: 'Analyse outputs', body: 'Results and logs land in S3, ready to compare across runs.', icon: BarChart3, to: href({ view: 'analytics' }) },
];

const CONCEPTS = [
  ['Robot application', 'The code that runs on the robot, packaged with a ROS software suite and versioned.'],
  ['Simulation application', 'The simulator (Gazebo) and the world the robot is tested in.'],
  ['Simulation job', 'One run of a robot application inside a simulation application, with a maximum duration.'],
  ['WorldForge', 'Procedural generation of many world variations from a template.'],
  ['Simulation unit (SU)', 'The billing unit: 1 vCPU and 2 GB of memory for one hour.'],
];

const MAPPING = [
  ['CreateRobotApplication, CreateRobotApplicationVersion', 'Robot applications page: type, software suite, motion limits, published versions'],
  ['WorldForge templates and world generation jobs', 'WorldForge page: five templates, size, density and seed; each job creates several worlds'],
  ['CreateSimulationJob', 'Job form with maxJobDurationInSeconds, failureBehavior, real-time factor and tags'],
  ['Simulation job lifecycle', 'Pending, Preparing, Running, Completed and Failed, plus RunningFailed, Terminating and Terminated'],
  ['StartSimulationJobBatch', 'Batches across worlds with maxConcurrency, plus an account limit of five active jobs'],
  ['CancelSimulationJob', 'Cancel a single job or an entire batch'],
  ['CloudWatch Logs', 'A log stream per job with live tail and filtering'],
  ['S3 output location', 'result.json, trajectory.csv and the robot application log, downloadable per job'],
  ['Gazebo client', 'Three.js 3D viewer with orbit camera and live robot position'],
  ['Simulation-unit billing', 'Cost per job, per planner and projected for 1,000 runs'],
];

const ENHANCEMENTS = [
  {
    icon: Trophy,
    title: 'Planner benchmark',
    body: 'One click runs A*, RRT and Potential Field on the same world with the same start and goal. All three robots race in the 3D viewer and the results are ranked metric by metric.',
  },
  {
    icon: Sparkles,
    title: 'AI insights',
    body: 'Google Gemini, called through Genkit from a Next.js server action, reviews the results and explains which planner performed best, why jobs failed and what to tune.',
  },
  {
    icon: DollarSign,
    title: 'Cost explorer',
    body: 'Estimates SU-hours and cost per job and per planner, and projects the cost of 1,000 runs. RoboMaker only reported this on the monthly bill.',
  },
  {
    icon: Calculator,
    title: 'Planner metrics',
    body: 'Every job records optimality against the A* shortest path, nodes expanded, energy, turns and minimum obstacle clearance.',
  },
];

export default function AboutView() {
  return (
    <>
      <PageHeader title="About AWS RoboMaker" description="The AWS service this project simulates, how it worked, and how each part maps to RoboSim." />

      <div className="mb-6 flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          AWS ended support for RoboMaker on 10 September 2025 and now recommends AWS Batch for running simulations. RoboSim recreates RoboMaker&apos;s
          workflow as a learning tool and is not affiliated with Amazon Web Services.
        </p>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="What it was" />
          <div className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">AWS RoboMaker</span> was a managed service for testing robot software in simulation instead of on
              physical hardware. It ran ROS and ROS 2 applications inside Gazebo worlds on AWS-managed compute, scaled to hundreds of simulations in
              parallel, and used CloudWatch for logs and S3 for outputs.
            </p>
            <p>
              Teams used it to regression-test navigation code on every commit, to generate thousands of randomised worlds with WorldForge and find
              edge cases before deployment, and to produce training data for reinforcement learning. AWS DeepRacer was built on top of it.
            </p>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Key concepts" />
          <dl className="divide-y divide-border">
            {CONCEPTS.map(([k, v]) => (
              <div key={k} className="px-5 py-2.5">
                <dt className="text-sm font-medium">{k}</dt>
                <dd className="text-xs text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Workflow" description="Each step links to the matching part of RoboSim" />
        <ol className="grid divide-y divide-border md:grid-cols-5 md:divide-x md:divide-y-0">
          {WORKFLOW.map((w, i) => (
            <li key={w.title}>
              <a href={w.to} className="group flex h-full flex-col gap-2 p-5 transition-colors hover:bg-accent/40">
                <div className="flex items-center justify-between">
                  <w.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p className="text-sm font-medium">{w.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{w.body}</p>
              </a>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="How RoboSim maps to RoboMaker" description="Core functionality" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">RoboMaker</th>
                  <th className="px-5 py-2.5 font-medium">RoboSim</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map(([aws, ours]) => (
                  <tr key={aws} className="border-b border-border/60 align-top last:border-0">
                    <td className="px-5 py-2.5 font-medium">{aws}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title="Enhancements beyond RoboMaker" />
          <div className="divide-y divide-border">
            {ENHANCEMENTS.map(e => (
              <div key={e.title} className="flex gap-4 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <e.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
