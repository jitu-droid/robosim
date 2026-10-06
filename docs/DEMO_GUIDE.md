# Demo guide (about 5 minutes)

Before the demo, click **Reset demo** (top right) so you start from clean data: 2 robot applications, 4 worlds, no jobs.

## 1. Explain the service (Understanding of AWS service — 2 marks)

Open the **Service** section and talk through it:

- RoboMaker ran robot software (ROS) inside simulated worlds (Gazebo) on AWS compute, so teams could test without real robots.
- Workflow: robot application → simulation world → simulation job → monitor (CloudWatch logs) → outputs (S3).
- Billing was per simulation-unit hour (1 SU = 1 vCPU + 2 GB RAM).
- Point at the mapping table: every RoboMaker concept has a matching feature here.
- Mention that AWS ended support in September 2025, and that this project recreates its workflow.

## 2. Core simulation (3 marks)

1. **Robot Applications.** Create one (e.g. `Delivery-Bot`, Mobile robot, 1.5 m/s). Show the ARN and click the upload icon to publish v2. Explain that jobs pin the version they launched with.
2. **WorldForge.** Pick *Warehouse*, Medium, 3 worlds, and click Generate. Point out that it runs as a world generation job, and that the same seed always gives the same layout.
3. **Simulation Jobs.** Choose the robot app and the *Random Clutter* world, click the map to set start and goal, and click **Create job**.
   - Watch the status go **Pending → Preparing → Running → Completed**.
   - Click **Show equivalent AWS CLI command**.
4. **Viewer.** The robot drives the planned path in 3D (drag to orbit). Open the tabs:
   - **Logs**: CloudWatch-style stream with live tail and filter.
   - **S3**: download `result.json` and `trajectory.csv`.
5. **Batch.** Click **Batch over worlds**, select all worlds, set maxConcurrency 2, and start. Show jobs waiting in Pending until a slot frees up. Cancel one job to show **Terminating → Terminated**.

## 3. Enhancements (2 marks)

1. **🏁 Benchmark all 3 planners** on *Random Clutter #2*. All three robots race in the viewer. Then open **Analytics → Benchmark results** to see the ★ best value per metric.
2. Benchmark again on *Office Floor #1* or *Maze #3*. Potential Field fails with `RobotApplicationCrash` ("trapped in a local minimum"), which shows why planner choice matters.
3. **AI insights.** Click *Analyse results*. Gemini explains the comparison and the failures.
4. **Cost explorer.** Show the cost per algorithm and the 1,000-run projection.

## Likely questions

**Is this connected to real AWS?**
No. It is a faithful simulation of the RoboMaker API concepts and lifecycle, running in the browser. The AI insights feature calls Google Gemini through a Next.js server action.

**How does the job lifecycle work?**
`lib/robomaker/engine.ts` runs a control loop every 200 ms. Pending jobs start only when fewer than 5 jobs are active account-wide and the batch's maxConcurrency allows it. Preparing takes about 2.4 s (bundle download, world launch, planner start). Then the planner runs. On success the job goes to Running; on failure it goes to Failed (or RunningFailed if failureBehavior is Continue). Running ends when the robot reaches the goal (Completed), or when maxJobDurationInSeconds is hit (Completed, goal missed).

**How is the robot's motion simulated?**
A trapezoidal velocity profile: accelerate at max acceleration up to max speed, cruise, then decelerate. Position along the path is interpolated from simulated time. Simulated time = wall time × real-time factor.

**Why can RRT show a shorter path than A\*?**
A\* is optimal on the 8-connected grid, but its paths can only move in 45° steps. RRT works in continuous space, so it occasionally finds a slightly shorter any-angle route. Optimality is capped at 100%.

**Why does Potential Field fail?**
The robot follows the sum of an attractive force (toward the goal) and repulsive forces (away from obstacles). Walls between the robot and the goal create local minima where the forces cancel. It tries random escapes, then gives up.

**How is cost calculated?**
SU-hours = simulation units × billed hours, where billed time runs from Preparing until the job ends. Cost = SU-hours × $0.40. A small world uses 2 SUs (1 for the robot application, 1 for the world); larger worlds use more.

**Where is data stored?**
In the browser's localStorage. Every viewer gets their own copy; Reset demo restores the seed data.
