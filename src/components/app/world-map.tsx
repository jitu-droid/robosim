'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Point, SimulationWorld } from '@/lib/robomaker/types';

interface WorldMapProps {
  world: Pick<SimulationWorld, 'width' | 'height' | 'obstacles'>;
  start?: Point;
  goal?: Point;
  paths?: { points: Point[]; color: string }[];
  onCellClick?: (cell: Point) => void;
  className?: string;
}

/** Top-down 2D occupancy map of a world, optionally clickable to pick cells. */
export default function WorldMap({ world, start, goal, paths, onCellClick, className }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const size = canvas.clientWidth;
      if (!size) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = size / Math.max(world.width, world.height);

      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(0, 0, size, size);
      if (cell >= 6) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= world.width; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cell, 0);
          ctx.lineTo(i * cell, world.height * cell);
          ctx.stroke();
        }
        for (let i = 0; i <= world.height; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * cell);
          ctx.lineTo(world.width * cell, i * cell);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#3f3f50';
      for (const o of world.obstacles) ctx.fillRect(o.x * cell, o.y * cell, cell, cell);

      for (const path of paths ?? []) {
        if (path.points.length < 2) continue;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = Math.max(1.5, cell * 0.18);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        path.points.forEach((p, i) => {
          const x = (p.x + 0.5) * cell;
          const y = (p.y + 0.5) * cell;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      const marker = (p: Point, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * cell, (p.y + 0.5) * cell, Math.max(3, cell * 0.38), 0, Math.PI * 2);
        ctx.fill();
      };
      if (start) marker(start, '#3b82f6');
      if (goal) marker(goal, '#10b981');
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [world, start, goal, paths]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('aspect-square w-full rounded-md border border-border', onCellClick && 'cursor-crosshair', className)}
      onClick={e => {
        if (!onCellClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cell = rect.width / Math.max(world.width, world.height);
        const x = Math.floor((e.clientX - rect.left) / cell);
        const y = Math.floor((e.clientY - rect.top) / cell);
        if (x >= 0 && y >= 0 && x < world.width && y < world.height) onCellClick({ x, y });
      }}
    />
  );
}
