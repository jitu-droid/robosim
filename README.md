# RoboSim — an AWS RoboMaker simulation

RoboSim is a web app that simulates **AWS RoboMaker**, AWS's managed robotics simulation service. It recreates RoboMaker's core workflow in the browser: robot applications, WorldForge world generation, simulation jobs and batches, CloudWatch-style logs and S3 outputs. It then adds features that RoboMaker didn't have.

Built for **BCSE355L Cloud Architecture Design — Digital Assignment 3 (AWS Service Simulation & Enhancement)**.

> Educational project. Not affiliated with or endorsed by Amazon Web Services. AWS ended support for RoboMaker on 10 September 2025.

**Live demo:** _add your Vercel URL here_

---

## What is AWS RoboMaker?

RoboMaker let robotics teams test robot software in simulation instead of on physical hardware. A developer would:

1. Package the robot code (ROS / ROS 2) as a **robot application**.
2. Package the simulator and world as a **simulation application**, or generate worlds with **WorldForge**.
3. Launch a **simulation job** (or a **batch** of jobs) that runs both on AWS-managed compute for up to a maximum duration.
4. Watch it live in Gazebo, with logs streamed to **CloudWatch**.
5. Collect results from the **S3** output location. Billing was per **simulation unit (SU) hour**, where 1 SU = 1 vCPU + 2 GB RAM.

## How RoboSim maps to RoboMaker (core functionality)

| RoboMaker | RoboSim |
|---|---|
| `CreateRobotApplication`, versions | **Robot Applications**: name, robot type (mobile / arm / mobile manipulator), software suite, speed and acceleration limits; publish new versions. Jobs pin the version they launched with. |
| WorldForge templates and world generation jobs | **WorldForge**: 5 templates (empty room, warehouse, maze, office, clutter), size, density and seed. Generation jobs create N reproducible worlds. |
| `CreateSimulationJob` | Job form: robot app, world, path planner, start/goal picked on a map, `maxJobDurationInSeconds`, `failureBehavior` (Fail / Continue), real-time factor, tags |
| Job lifecycle | `Pending → Preparing → Running → Completed / Failed`, plus `RunningFailed`, `Terminating` and `Terminated` |
| `StartSimulationJobBatch` | Batch over many worlds with `maxConcurrency`, plus an account-wide limit of 5 active jobs (extra jobs queue in Pending) |
| `CancelSimulationJob` | Cancel one job or a whole batch |
| CloudWatch Logs | Per-job log stream (`/aws/robomaker/SimulationJobs`) with live tail and filter |
| S3 output location | `result.json`, `trajectory.csv`, `logs/robot_application.log` per job, all downloadable |
| Gazebo GUI | Three.js 3D viewer with orbit camera and live robot pose |
| AWS CLI | Every job shows the equivalent `aws robomaker create-simulation-job` command |

Robots navigate with real path planners: **A\*** (8-connected, optimal on the grid), **RRT** (sampling-based) and **Artificial Potential Field** (reactive, can get stuck in local minima). If planning fails, the job fails with `RobotApplicationCrash`, the way a crashing robot app would in RoboMaker.

## Enhancements beyond RoboMaker

1. **Algorithm benchmark.** One click runs A\*, RRT and Potential Field on the same world, start and goal. All three robots race in the 3D viewer, and a results table ranks them on path length, optimality, planning time, nodes expanded, time and energy.
2. **AI performance insights.** Google Gemini (through Genkit) analyses every finished job and explains which planner wins, why jobs failed and what to tune. If no API key is set, a built-in rule-based analyser is used instead.
3. **Cost explorer.** Estimates SU-hours and dollar cost per job and per algorithm at $0.40/SU-hour, and projects the cost of 1,000 runs.
4. **Richer metrics.** Every job records optimality vs. the A\* shortest path, nodes expanded, energy, turns and minimum obstacle clearance.

## Tech stack

- **Next.js 15**, React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix)
- **Three.js** for 3D simulation, **Recharts** for analytics
- **Genkit + Gemini 2.5 Flash** for AI insights (Next.js server action)
- State is kept in the browser (`localStorage`), so no backend database is needed

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:9002.

For AI insights, create `.env.local` with a Gemini API key from https://aistudio.google.com/apikey:

```
GEMINI_API_KEY=your-key-here
```

## Deploy (Vercel)

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project**, import the repo and keep the defaults (Next.js is auto-detected).
3. Under **Environment Variables**, add `GEMINI_API_KEY` (optional; without it the built-in analyser is used).
4. Click **Deploy** and put the URL at the top of this README.

## Project structure

```
src/
  app/                    page, layout, server action for AI analysis
  ai/                     Genkit setup and the Gemini analysis flow
  components/app/         console UI, one view per page
    console-shell.tsx     top bar and sidebar navigation
    overview-view.tsx     dashboard and getting-started checklist
    robots-view.tsx       Robot applications
    worlds-view.tsx       WorldForge templates, generation jobs, worlds
    jobs-view.tsx         Simulation job list and batches
    new-job-view.tsx      Create job, benchmark and batch launcher
    job-detail-view.tsx   3D viewer, lifecycle, metrics, logs, S3 outputs, CLI
    analytics-view.tsx    Charts, benchmark table, AI insights, cost explorer
    about-view.tsx        "About AWS RoboMaker" and concept mapping
  lib/router.ts           hash-based page routing (#/jobs, #/jobs/<id>, ...)
  lib/robomaker/          the simulated service
    engine.ts             control loop: job lifecycle, scheduling, concurrency
    store.tsx             React state + localStorage persistence
    worlds.ts             WorldForge templates and procedural generation
    motion.ts             trapezoidal velocity profile, pose along path
    pricing.ts            SU-hour billing
    outputs.ts            S3 output objects
    insights.ts           metrics aggregation and built-in analyser
  lib/pathfinding/        A*, RRT, Potential Field
```

See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for a step-by-step demo script and likely viva questions.
