import { seededRandom } from './ids';
import type { Point, SimulationWorld, WorldSize, WorldTemplateId } from './types';

export interface WorldTemplate {
  id: WorldTemplateId;
  name: string;
  description: string;
  usesDensity: boolean;
}

export const WORLD_TEMPLATES: WorldTemplate[] = [
  { id: 'empty', name: 'Empty Room', description: 'Open floor with a few pillars. Baseline for tuning.', usesDensity: false },
  { id: 'warehouse', name: 'Warehouse', description: 'Rows of shelving racks with randomised cross-aisles.', usesDensity: true },
  { id: 'maze', name: 'Maze', description: 'Perfect maze — a single route between any two cells.', usesDensity: false },
  { id: 'office', name: 'Office Floor', description: 'Rooms, corridors and doorways, like a WorldForge residence.', usesDensity: true },
  { id: 'clutter', name: 'Random Clutter', description: 'Randomly scattered obstacles at a chosen density.', usesDensity: true },
];

export const WORLD_SIZES: Record<WorldSize, { label: string; dim: number; simulationUnits: number }> = {
  small: { label: 'Small (15 × 15 m)', dim: 15, simulationUnits: 1 },
  medium: { label: 'Medium (25 × 25 m)', dim: 25, simulationUnits: 2 },
  large: { label: 'Large (35 × 35 m)', dim: 35, simulationUnits: 3 },
};

type Grid = boolean[][]; // grid[y][x] === true means blocked

function emptyGrid(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<boolean>(w).fill(false));
}

function generateEmpty(w: number, h: number, rnd: () => number): Grid {
  const g = emptyGrid(w, h);
  const pillars = Math.max(2, Math.floor((w * h) / 90));
  for (let i = 0; i < pillars; i++) {
    const x = 2 + Math.floor(rnd() * (w - 4));
    const y = 2 + Math.floor(rnd() * (h - 4));
    g[y][x] = true;
  }
  return g;
}

function generateWarehouse(w: number, h: number, rnd: () => number, density: number): Grid {
  const g = emptyGrid(w, h);
  // Vertical racks every 3 columns, leaving a 2-cell margin top and bottom.
  for (let x = 2; x < w - 2; x += 3) {
    for (let y = 2; y < h - 2; y++) g[y][x] = true;
  }
  // Cross-aisles: fewer gaps at higher density.
  const gapChance = 0.35 - density * 0.25;
  for (let x = 2; x < w - 2; x += 3) {
    for (let y = 2; y < h - 2; y++) {
      if (y % 6 === 0 || rnd() < gapChance * 0.3) g[y][x] = false;
    }
  }
  // Pallets dropped in aisles.
  const pallets = Math.floor(w * h * density * 0.04);
  for (let i = 0; i < pallets; i++) {
    const x = 1 + Math.floor(rnd() * (w - 2));
    const y = 1 + Math.floor(rnd() * (h - 2));
    g[y][x] = true;
  }
  return g;
}

function generateMaze(w: number, h: number, rnd: () => number): Grid {
  // Recursive backtracker on odd coordinates; everything starts as wall.
  const g: Grid = Array.from({ length: h }, () => Array<boolean>(w).fill(true));
  const stack: Point[] = [{ x: 0, y: 0 }];
  g[0][0] = false;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ].sort(() => rnd() - 0.5);
    let moved = false;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && g[ny][nx]) {
        g[cur.y + dy / 2][cur.x + dx / 2] = false;
        g[ny][nx] = false;
        stack.push({ x: nx, y: ny });
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  // Open the last row/column when the dimension is even so the far corner is reachable.
  if (w % 2 === 0) for (let y = 0; y < h; y += 2) g[y][w - 1] = false;
  if (h % 2 === 0) for (let x = 0; x < w; x += 2) g[h - 1][x] = false;
  return g;
}

function generateOffice(w: number, h: number, rnd: () => number, density: number): Grid {
  const g = emptyGrid(w, h);
  const room = 6;
  // Interior walls on a room grid, with one or two doorways per wall segment.
  for (let x = room; x < w - 1; x += room) {
    for (let y = 0; y < h; y++) g[y][x] = true;
  }
  for (let y = room; y < h - 1; y += room) {
    for (let x = 0; x < w; x++) g[y][x] = true;
  }
  // One doorway in every wall segment between two junctions.
  for (let x = room; x < w - 1; x += room) {
    for (let y0 = 0; y0 < h; y0 += room) {
      const end = Math.min(y0 + room, h);
      if (end - y0 > 1) g[y0 + 1 + Math.floor(rnd() * (end - y0 - 1))][x] = false;
    }
  }
  for (let y = room; y < h - 1; y += room) {
    for (let x0 = 0; x0 < w; x0 += room) {
      const end = Math.min(x0 + room, w);
      if (end - x0 > 1) g[y][x0 + 1 + Math.floor(rnd() * (end - x0 - 1))] = false;
    }
  }
  // Furniture, kept away from walls so doorways stay usable.
  const furniture = Math.floor(w * h * density * 0.03);
  for (let i = 0; i < furniture; i++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(rnd() * h);
    const mx = x % room;
    const my = y % room;
    if (mx >= 2 && mx <= room - 2 && my >= 2 && my <= room - 2) g[y][x] = true;
  }
  return g;
}

function generateClutter(w: number, h: number, rnd: () => number, density: number): Grid {
  const g = emptyGrid(w, h);
  const p = 0.08 + density * 0.27;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rnd() < p) g[y][x] = true;
    }
  }
  return g;
}

/** Generates the obstacle layout for one world. Corners are always kept clear for start/goal. */
export function generateLayout(
  templateId: WorldTemplateId,
  size: WorldSize,
  density: number,
  seed: number
): { width: number; height: number; obstacles: Point[] } {
  const dim = WORLD_SIZES[size].dim;
  const rnd = seededRandom(seed);
  let g: Grid;
  switch (templateId) {
    case 'warehouse':
      g = generateWarehouse(dim, dim, rnd, density);
      break;
    case 'maze':
      g = generateMaze(dim, dim, rnd);
      break;
    case 'office':
      g = generateOffice(dim, dim, rnd, density);
      break;
    case 'clutter':
      g = generateClutter(dim, dim, rnd, density);
      break;
    default:
      g = generateEmpty(dim, dim, rnd);
  }
  for (const [cx, cy] of [
    [0, 0],
    [dim - 1, dim - 1],
  ]) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < dim && y < dim && (templateId !== 'maze' || (dx === 0 && dy === 0))) g[y][x] = false;
      }
    }
  }
  const obstacles: Point[] = [];
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) if (g[y][x]) obstacles.push({ x, y });
  }
  return { width: dim, height: dim, obstacles };
}

export function obstacleSet(world: Pick<SimulationWorld, 'obstacles'>): Set<string> {
  return new Set(world.obstacles.map(p => `${p.x},${p.y}`));
}

/** Finds the free cell nearest to the requested point. */
export function nearestFreeCell(world: SimulationWorld, target: Point): Point {
  const blocked = obstacleSet(world);
  let best = target;
  let bestD = Infinity;
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (blocked.has(`${x},${y}`)) continue;
      const d = (x - target.x) ** 2 + (y - target.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

export function defaultStartGoal(world: SimulationWorld): { start: Point; goal: Point } {
  return {
    start: nearestFreeCell(world, { x: 0, y: 0 }),
    goal: nearestFreeCell(world, { x: world.width - 1, y: world.height - 1 }),
  };
}
