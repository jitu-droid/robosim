export const REGION = 'us-east-1';
export const ACCOUNT_ID = '123456789012';
export const OUTPUT_BUCKET = 'robosim-simulation-output';
export const LOG_GROUP = '/aws/robomaker/SimulationJobs';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomId(prefix: string, length = 12): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${id}`;
}

export function arn(resource: string, id: string): string {
  return `arn:aws:robomaker:${REGION}:${ACCOUNT_ID}:${resource}/${id}`;
}

/** Deterministic PRNG (mulberry32) so worlds and RRT runs are reproducible from a seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
