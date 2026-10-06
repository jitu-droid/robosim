export type RobotType = 'mobile' | 'arm' | 'hybrid';

export type Point = {
  x: number;
  y: number;
};

export type RobotOptions = {
  id: string;
  name: string;
};

export interface Robot {
  id: string;
  name: string;
  type: RobotType;
  planPath(): void;
}

export type Algorithm = 'astar' | 'rrt' | 'potentialField';

export type SimulationResult = {
  algorithm: Algorithm;
  pathLength: number;
  computationTime: number; // in ms
  robotId: string;
  robotName: string;
};

export type AnalysisResult = {
    summary: string;
    data: SimulationResult[];
};
