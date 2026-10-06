'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { cancelJob, newJobLog, tick } from './engine';
import { arn, randomId } from './ids';
import { ROBOT_APP_SIMULATION_UNITS } from './pricing';
import { WORLD_SIZES } from './worlds';
import type {
  Algorithm,
  FailureBehavior,
  Point,
  RoboMakerState,
  RobotApplication,
  RobotType,
  SimulationJob,
  SimulationJobBatch,
  SoftwareSuite,
  WorldGenerationJob,
  WorldSize,
  WorldTemplateId,
} from './types';

const STORAGE_KEY = 'robosim:robomaker:v1';
const TICK_MS = 200;

const EMPTY_STATE: RoboMakerState = { robotApps: [], worlds: [], worldJobs: [], jobs: [], batches: [], selectedJobId: null };

type Action =
  | { type: 'hydrate'; state: RoboMakerState }
  | { type: 'tick'; now: number }
  | { type: 'addRobotApp'; app: RobotApplication }
  | { type: 'publishRobotAppVersion'; id: string; now: number }
  | { type: 'deleteRobotApp'; id: string }
  | { type: 'addWorldJob'; job: WorldGenerationJob }
  | { type: 'deleteWorld'; id: string }
  | { type: 'addJobs'; jobs: SimulationJob[]; batch?: SimulationJobBatch }
  | { type: 'cancelJob'; id: string; now: number }
  | { type: 'cancelBatch'; id: string; now: number }
  | { type: 'deleteJob'; id: string }
  | { type: 'select'; id: string | null };

function reducer(state: RoboMakerState, action: Action): RoboMakerState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'tick':
      return tick(state, action.now);
    case 'addRobotApp':
      return { ...state, robotApps: [action.app, ...state.robotApps] };
    case 'publishRobotAppVersion':
      return {
        ...state,
        robotApps: state.robotApps.map(a => (a.id === action.id ? { ...a, version: a.version + 1, updatedAt: action.now } : a)),
      };
    case 'deleteRobotApp':
      return { ...state, robotApps: state.robotApps.filter(a => a.id !== action.id) };
    case 'addWorldJob':
      return { ...state, worldJobs: [action.job, ...state.worldJobs] };
    case 'deleteWorld':
      return { ...state, worlds: state.worlds.filter(w => w.id !== action.id) };
    case 'addJobs':
      return {
        ...state,
        jobs: [...action.jobs, ...state.jobs],
        batches: action.batch ? [action.batch, ...state.batches] : state.batches,
        selectedJobId: action.jobs[0]?.id ?? state.selectedJobId,
      };
    case 'cancelJob':
      return { ...state, jobs: state.jobs.map(j => (j.id === action.id ? cancelJob(j, action.now) : j)) };
    case 'cancelBatch':
      return { ...state, jobs: state.jobs.map(j => (j.batchId === action.id ? cancelJob(j, action.now) : j)) };
    case 'deleteJob':
      return {
        ...state,
        jobs: state.jobs.filter(j => j.id !== action.id),
        selectedJobId: state.selectedJobId === action.id ? null : state.selectedJobId,
      };
    case 'select':
      return { ...state, selectedJobId: action.id };
  }
}

export interface RobotAppInput {
  name: string;
  type: RobotType;
  softwareSuite: SoftwareSuite;
  maxSpeed: number;
  maxAcceleration: number;
}

export interface WorldGenerationInput {
  templateId: WorldTemplateId;
  size: WorldSize;
  density: number;
  seed: number;
  count: number;
}

export interface JobInput {
  name?: string;
  robotAppId: string;
  worldId: string;
  algorithm: Algorithm;
  start: Point;
  goal: Point;
  maxJobDurationInSeconds: number;
  failureBehavior: FailureBehavior;
  realTimeFactor: number;
  tags: Record<string, string>;
}

function buildRobotApp(input: RobotAppInput, now: number): RobotApplication {
  const id = `${input.name.trim().replace(/[^a-zA-Z0-9_-]+/g, '-')}-${Math.floor(now / 1000)}`;
  return { ...input, name: input.name.trim(), id, arn: arn('robot-application', id), version: 1, createdAt: now, updatedAt: now };
}

function buildWorldJob(input: WorldGenerationInput, now: number): WorldGenerationJob {
  const id = randomId('wgj');
  return { ...input, id, arn: arn('world-generation-job', id), status: 'Pending', createdAt: now, worldIds: [] };
}

function seedState(now: number): RoboMakerState {
  const robotApps = [
    buildRobotApp({ name: 'TurtleBot-Navigator', type: 'mobile', softwareSuite: 'ROS2 Humble', maxSpeed: 1.2, maxAcceleration: 0.8 }, now),
    buildRobotApp({ name: 'Warehouse-AMR', type: 'hybrid', softwareSuite: 'ROS2 Humble', maxSpeed: 1.6, maxAcceleration: 1.0 }, now - 1000),
  ];
  // Chosen so the first benchmark shows all three planners succeeding, then office and maze worlds expose their weaknesses.
  const seedWorlds: [string, WorldGenerationInput][] = [
    ['wgj-seedclutter01', { templateId: 'clutter', size: 'small', density: 0.35, seed: 2, count: 1 }],
    ['wgj-seedwarehouse', { templateId: 'warehouse', size: 'medium', density: 0.4, seed: 42, count: 1 }],
    ['wgj-seedoffice001', { templateId: 'office', size: 'small', density: 0.3, seed: 1, count: 1 }],
    ['wgj-seedmaze00001', { templateId: 'maze', size: 'small', density: 0, seed: 3, count: 1 }],
  ];
  const worldJobs: WorldGenerationJob[] = seedWorlds.map(([id, input]) => ({
    ...buildWorldJob(input, now),
    id,
    arn: arn('world-generation-job', id),
    createdAt: now - 60_000,
    status: 'Running',
  }));
  // Running the control loop once materialises the seeded worlds.
  return tick({ ...EMPTY_STATE, robotApps, worldJobs }, now);
}

interface RoboMakerContextValue {
  state: RoboMakerState;
  hydrated: boolean;
  createRobotApp: (input: RobotAppInput) => RobotApplication;
  publishRobotAppVersion: (id: string) => void;
  deleteRobotApp: (id: string) => void;
  startWorldGeneration: (input: WorldGenerationInput) => WorldGenerationJob;
  deleteWorld: (id: string) => void;
  createSimulationJob: (input: JobInput) => SimulationJob | null;
  startSimulationJobBatch: (name: string, inputs: JobInput[], maxConcurrency: number, kind: SimulationJobBatch['kind']) => SimulationJobBatch | null;
  cloneJob: (id: string) => SimulationJob | null;
  cancelJob: (id: string) => void;
  cancelBatch: (id: string) => void;
  deleteJob: (id: string) => void;
  selectJob: (id: string | null) => void;
  resetAll: () => void;
}

const RoboMakerContext = createContext<RoboMakerContextValue | null>(null);

export function RoboMakerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load persisted state (or seed demo data) once on the client.
  useEffect(() => {
    let loaded: RoboMakerState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = { ...EMPTY_STATE, ...JSON.parse(raw) };
    } catch {
      loaded = null;
    }
    dispatch({ type: 'hydrate', state: loaded ?? seedState(Date.now()) });
    setHydrated(true);
  }, []);

  // Persist changes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable: the app keeps working in memory.
    }
  }, [state, hydrated]);

  // Service control loop.
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated]);

  const buildJob = useCallback((input: JobInput, now: number, batchId?: string): SimulationJob | null => {
    const app = stateRef.current.robotApps.find(a => a.id === input.robotAppId);
    const world = stateRef.current.worlds.find(w => w.id === input.worldId);
    if (!app || !world) return null;
    const id = randomId('sim');
    const job: SimulationJob = {
      id,
      arn: arn('simulation-job', id),
      name: input.name?.trim() || `${app.name}-${input.algorithm}`,
      robotAppId: app.id,
      robotAppName: app.name,
      robotAppVersion: app.version,
      robotType: app.type,
      maxSpeed: app.maxSpeed,
      maxAcceleration: app.maxAcceleration,
      worldId: world.id,
      worldName: world.name,
      simulationUnits: ROBOT_APP_SIMULATION_UNITS + WORLD_SIZES[world.size].simulationUnits,
      algorithm: input.algorithm,
      start: input.start,
      goal: input.goal,
      maxJobDurationInSeconds: input.maxJobDurationInSeconds,
      failureBehavior: input.failureBehavior,
      realTimeFactor: input.realTimeFactor,
      tags: input.tags,
      batchId,
      status: 'Pending',
      createdAt: now,
      logs: [],
    };
    return newJobLog(job, now);
  }, []);

  const value = useMemo<RoboMakerContextValue>(
    () => ({
      state,
      hydrated,
      createRobotApp: input => {
        const app = buildRobotApp(input, Date.now());
        dispatch({ type: 'addRobotApp', app });
        return app;
      },
      publishRobotAppVersion: id => dispatch({ type: 'publishRobotAppVersion', id, now: Date.now() }),
      deleteRobotApp: id => dispatch({ type: 'deleteRobotApp', id }),
      startWorldGeneration: input => {
        const job = buildWorldJob(input, Date.now());
        dispatch({ type: 'addWorldJob', job });
        return job;
      },
      deleteWorld: id => dispatch({ type: 'deleteWorld', id }),
      createSimulationJob: input => {
        const job = buildJob(input, Date.now());
        if (job) dispatch({ type: 'addJobs', jobs: [job] });
        return job;
      },
      startSimulationJobBatch: (name, inputs, maxConcurrency, kind) => {
        const now = Date.now();
        const id = randomId('sim-batch', 8);
        const jobs = inputs.map((input, i) => buildJob(input, now + i, id)).filter((j): j is SimulationJob => j !== null);
        if (!jobs.length) return null;
        const batch: SimulationJobBatch = { id, arn: arn('simulation-job-batch', id), name, kind, maxConcurrency, jobIds: jobs.map(j => j.id), createdAt: now };
        dispatch({ type: 'addJobs', jobs, batch });
        return batch;
      },
      cloneJob: id => {
        const src = stateRef.current.jobs.find(j => j.id === id);
        if (!src) return null;
        const job = buildJob(
          {
            name: `${src.name}-clone`,
            robotAppId: src.robotAppId,
            worldId: src.worldId,
            algorithm: src.algorithm,
            start: src.start,
            goal: src.goal,
            maxJobDurationInSeconds: src.maxJobDurationInSeconds,
            failureBehavior: src.failureBehavior,
            realTimeFactor: src.realTimeFactor,
            tags: src.tags,
          },
          Date.now()
        );
        if (job) dispatch({ type: 'addJobs', jobs: [job] });
        return job;
      },
      cancelJob: id => dispatch({ type: 'cancelJob', id, now: Date.now() }),
      cancelBatch: id => dispatch({ type: 'cancelBatch', id, now: Date.now() }),
      deleteJob: id => dispatch({ type: 'deleteJob', id }),
      selectJob: id => dispatch({ type: 'select', id }),
      resetAll: () => dispatch({ type: 'hydrate', state: seedState(Date.now()) }),
    }),
    [state, hydrated, buildJob]
  );

  return <RoboMakerContext.Provider value={value}>{children}</RoboMakerContext.Provider>;
}

export function useRoboMaker(): RoboMakerContextValue {
  const ctx = useContext(RoboMakerContext);
  if (!ctx) throw new Error('useRoboMaker must be used inside <RoboMakerProvider>');
  return ctx;
}

/** Re-renders the caller on an interval so live progress, timers and costs stay current. */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
