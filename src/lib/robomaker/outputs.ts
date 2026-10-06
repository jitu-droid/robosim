import { jobPoseAt } from './engine';
import { LOG_GROUP, OUTPUT_BUCKET } from './ids';
import { TERMINAL_STATUSES, type SimulationJob } from './types';

export interface OutputObject {
  key: string;
  contentType: string;
  build: () => string;
}

export function outputPrefix(job: SimulationJob): string {
  return `s3://${OUTPUT_BUCKET}/${job.id}/`;
}

export function logStreamName(job: SimulationJob): string {
  return `${job.id}/robot_application`;
}

function formatLogs(job: SimulationJob): string {
  return job.logs.map(l => `${new Date(l.t).toISOString()} ${l.level.padEnd(5)} ${l.message}`).join('\n');
}

/** The objects RoboMaker would have written to the job's S3 output location. */
export function jobOutputs(job: SimulationJob): OutputObject[] {
  if (!TERMINAL_STATUSES.includes(job.status)) return [];
  const objects: OutputObject[] = [
    {
      key: 'logs/robot_application.log',
      contentType: 'text/plain',
      build: () => `# CloudWatch log group ${LOG_GROUP}, stream ${logStreamName(job)}\n${formatLogs(job)}\n`,
    },
  ];
  if (job.path && job.metrics) {
    objects.unshift(
      {
        key: 'result.json',
        contentType: 'application/json',
        build: () =>
          JSON.stringify(
            {
              simulationJob: {
                arn: job.arn,
                name: job.name,
                status: job.status,
                goalReached: job.goalReached ?? false,
                failureCode: job.failureCode ?? null,
                createdAt: new Date(job.createdAt).toISOString(),
                endedAt: job.endedAt ? new Date(job.endedAt).toISOString() : null,
                maxJobDurationInSeconds: job.maxJobDurationInSeconds,
                realTimeFactor: job.realTimeFactor,
                tags: job.tags,
              },
              robotApplication: { name: job.robotAppName, version: job.robotAppVersion, type: job.robotType },
              world: { id: job.worldId, name: job.worldName },
              planner: { algorithm: job.algorithm, start: job.start, goal: job.goal },
              metrics: job.metrics,
              path: job.path,
            },
            null,
            2
          ),
      },
      {
        key: 'trajectory.csv',
        contentType: 'text/csv',
        build: () => {
          const rows = ['t_s,x_m,y_m,heading_deg,speed_mps'];
          const end = job.metrics!.simDuration;
          for (let t = 0; t <= end + 1e-9; t += 0.5) {
            const p = jobPoseAt(job, t);
            rows.push([t.toFixed(1), p.x.toFixed(3), p.y.toFixed(3), ((p.heading * 180) / Math.PI).toFixed(1), p.speed.toFixed(3)].join(','));
          }
          return rows.join('\n') + '\n';
        },
      }
    );
  }
  return objects;
}

export function downloadText(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
