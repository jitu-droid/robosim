import { arn } from './ids';
import type { Algorithm, FailureBehavior, Point } from './types';

interface CliInput {
  robotAppArn: string;
  robotAppVersion: number | '$LATEST';
  worldArn: string;
  algorithm: Algorithm;
  start: Point;
  goal: Point;
  maxJobDurationInSeconds: number;
  failureBehavior: FailureBehavior;
  realTimeFactor: number;
  tags: Record<string, string>;
}

/** The AWS CLI call that would have launched the same job on real RoboMaker. */
export function createSimulationJobCli(input: CliInput): string {
  const robotApp = {
    application: input.robotAppArn,
    applicationVersion: String(input.robotAppVersion),
    launchConfig: {
      packageName: 'robosim_navigation',
      launchFile: 'navigate.launch.py',
      environmentVariables: {
        PLANNER: input.algorithm,
        START: `${input.start.x},${input.start.y}`,
        GOAL: `${input.goal.x},${input.goal.y}`,
      },
    },
  };
  const simApp = {
    application: arn('simulation-application', 'robosim-gazebo'),
    launchConfig: {
      packageName: 'robosim_worlds',
      launchFile: 'world.launch.py',
      environmentVariables: { REAL_TIME_FACTOR: String(input.realTimeFactor) },
    },
    worldConfigs: [{ world: input.worldArn }],
  };
  const tags = Object.entries(input.tags)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return [
    'aws robomaker create-simulation-job \\',
    `  --max-job-duration-in-seconds ${input.maxJobDurationInSeconds} \\`,
    `  --failure-behavior ${input.failureBehavior} \\`,
    '  --iam-role arn:aws:iam::123456789012:role/RoboMakerSimulationRole \\',
    '  --output-location s3Bucket=robosim-simulation-output \\',
    `  --robot-applications '${JSON.stringify([robotApp])}' \\`,
    `  --simulation-applications '${JSON.stringify([simApp])}'${tags ? ' \\' : ''}`,
    ...(tags ? [`  --tags ${tags}`] : []),
  ].join('\n');
}

export function parseTags(text: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of text.split(',')) {
    const [k, ...rest] = part.split('=');
    if (k?.trim() && rest.length) tags[k.trim()] = rest.join('=').trim();
  }
  return tags;
}
