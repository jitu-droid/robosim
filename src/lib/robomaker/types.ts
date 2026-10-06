import type { Point } from '@/lib/robots/types';

export type { Point };

export type RobotType = 'mobile' | 'arm' | 'hybrid';
export type Algorithm = 'astar' | 'rrt' | 'potentialField';
export type SoftwareSuite = 'ROS2 Humble' | 'ROS2 Foxy' | 'General';

/** Mirrors a RoboMaker robot application: the code that runs on the robot. */
export interface RobotApplication {
  arn: string;
  id: string;
  name: string;
  type: RobotType;
  softwareSuite: SoftwareSuite;
  maxSpeed: number; // m/s
  maxAcceleration: number; // m/s^2
  version: number; // latest published version ($LATEST is always editable)
  createdAt: number;
  updatedAt: number;
}

export type WorldTemplateId = 'empty' | 'warehouse' | 'maze' | 'office' | 'clutter';
export type WorldSize = 'small' | 'medium' | 'large';

/** Mirrors a WorldForge world: a generated simulation environment. */
export interface SimulationWorld {
  arn: string;
  id: string;
  name: string;
  templateId: WorldTemplateId;
  size: WorldSize;
  width: number;
  height: number;
  seed: number;
  density: number;
  obstacles: Point[];
  generationJobId: string;
  createdAt: number;
}

export type WorldGenerationStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';

/** Mirrors a WorldForge world generation job. */
export interface WorldGenerationJob {
  arn: string;
  id: string;
  templateId: WorldTemplateId;
  size: WorldSize;
  density: number;
  seed: number;
  count: number;
  status: WorldGenerationStatus;
  createdAt: number;
  finishedAt?: number;
  worldIds: string[];
}

/** Subset of the RoboMaker simulation job status enum. */
export type JobStatus =
  | 'Pending'
  | 'Preparing'
  | 'Running'
  | 'RunningFailed'
  | 'Terminating'
  | 'Completed'
  | 'Failed'
  | 'Terminated';

export type FailureBehavior = 'Fail' | 'Continue';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEvent {
  t: number; // epoch ms
  level: LogLevel;
  message: string;
}

export interface JobMetrics {
  pathLength: number; // m
  straightLine: number; // m
  optimalLength: number | null; // A* reference length, m
  optimality: number | null; // optimalLength / pathLength * 100
  planningMs: number;
  nodesExpanded: number;
  simDuration: number; // s, time to traverse path with the robot's motion profile
  energy: number; // J (estimated)
  turns: number;
  minClearance: number; // m to nearest obstacle edge
}

export interface SimulationJob {
  arn: string;
  id: string;
  name: string;
  // Snapshot of the robot application at launch (like a pinned application version)
  robotAppId: string;
  robotAppName: string;
  robotAppVersion: number;
  robotType: RobotType;
  maxSpeed: number;
  maxAcceleration: number;
  // Simulation application / world
  worldId: string;
  worldName: string;
  simulationUnits: number;
  algorithm: Algorithm;
  start: Point;
  goal: Point;
  maxJobDurationInSeconds: number;
  failureBehavior: FailureBehavior;
  realTimeFactor: number;
  batchId?: string;
  tags: Record<string, string>;
  status: JobStatus;
  createdAt: number;
  preparingAt?: number;
  prepStage?: number;
  runningAt?: number;
  terminatingAt?: number;
  endedAt?: number;
  lastPoseLogSecond?: number;
  goalReached?: boolean;
  failureCode?: string;
  failureReason?: string;
  path?: Point[];
  metrics?: JobMetrics;
  logs: LogEvent[];
}

export type BatchKind = 'batch' | 'benchmark';

/** Mirrors StartSimulationJobBatch. "benchmark" is RoboSim's algorithm comparison enhancement. */
export interface SimulationJobBatch {
  arn: string;
  id: string;
  name: string;
  kind: BatchKind;
  maxConcurrency: number;
  jobIds: string[];
  createdAt: number;
}

export interface RoboMakerState {
  robotApps: RobotApplication[];
  worlds: SimulationWorld[];
  worldJobs: WorldGenerationJob[];
  jobs: SimulationJob[];
  batches: SimulationJobBatch[];
  selectedJobId: string | null;
}

export const ACTIVE_STATUSES: JobStatus[] = ['Preparing', 'Running', 'RunningFailed', 'Terminating'];
export const TERMINAL_STATUSES: JobStatus[] = ['Completed', 'Failed', 'Terminated'];

export const ALGORITHM_LABELS: Record<Algorithm, string> = {
  astar: 'A*',
  rrt: 'RRT',
  potentialField: 'Potential Field',
};

export const ALGORITHM_COLORS: Record<Algorithm, string> = {
  astar: '#a855f7',
  rrt: '#f59e0b',
  potentialField: '#22d3ee',
};

export const ROBOT_TYPE_LABELS: Record<RobotType, string> = {
  mobile: 'Mobile robot',
  arm: 'Manipulator arm',
  hybrid: 'Mobile manipulator',
};
