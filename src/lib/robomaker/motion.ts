import type { Point } from './types';

/**
 * Trapezoidal velocity profile: accelerate at `a` up to `v`, cruise, then decelerate to stop.
 * If the path is too short to reach `v`, the profile is triangular.
 */
export function profileDuration(length: number, v: number, a: number): number {
  if (length <= 0) return 0;
  const accelDist = (v * v) / a;
  if (length >= accelDist) return length / v + v / a;
  return 2 * Math.sqrt(length / a);
}

export function distanceAt(t: number, length: number, v: number, a: number): number {
  const T = profileDuration(length, v, a);
  if (t <= 0) return 0;
  if (t >= T) return length;
  const accelDist = (v * v) / a;
  if (length >= accelDist) {
    const ta = v / a;
    const cruiseEnd = T - ta;
    if (t < ta) return 0.5 * a * t * t;
    if (t < cruiseEnd) return 0.5 * a * ta * ta + v * (t - ta);
    const td = T - t;
    return length - 0.5 * a * td * td;
  }
  const half = T / 2;
  if (t < half) return 0.5 * a * t * t;
  const td = T - t;
  return length - 0.5 * a * td * td;
}

export function speedAt(t: number, length: number, v: number, a: number): number {
  const T = profileDuration(length, v, a);
  if (t <= 0 || t >= T) return 0;
  const peak = Math.min(v, Math.sqrt(length * a));
  return Math.min(peak, a * t, a * (T - t));
}

export interface Pose {
  x: number;
  y: number;
  heading: number; // radians
}

/** Position and heading after travelling `s` metres along a polyline. */
export function poseAlongPath(path: Point[], s: number): Pose {
  if (path.length === 0) return { x: 0, y: 0, heading: 0 };
  if (path.length === 1) return { ...path[0], heading: 0 };
  let remaining = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const heading = Math.atan2(b.y - a.y, b.x - a.x);
    if (remaining <= seg || i === path.length - 1) {
      const t = seg === 0 ? 1 : Math.min(1, remaining / seg);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading };
    }
    remaining -= seg;
  }
  const last = path[path.length - 1];
  return { ...last, heading: 0 };
}
