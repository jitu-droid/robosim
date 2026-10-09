'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { jobPoseAt, jobSimSeconds } from '@/lib/robomaker/engine';
import { ALGORITHM_COLORS, type RobotType, type SimulationJob, type SimulationWorld } from '@/lib/robomaker/types';

interface SimulationViewerProps {
  world: SimulationWorld;
  jobs: SimulationJob[]; // first job is the primary one; the rest are overlaid (benchmark race)
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  content: THREE.Group;
  robots: { jobId: string; mesh: THREE.Group }[];
}

/** Current robot position for a job, whatever state it is in. */
export function currentPose(job: SimulationJob, now: number) {
  if (!job.path || !job.metrics) return { x: job.start.x, y: job.start.y, heading: 0, speed: 0, travelled: 0 };
  const pose = jobPoseAt(job, Math.min(jobSimSeconds(job, now), job.maxJobDurationInSeconds));
  return job.status === 'Running' ? pose : { ...pose, speed: 0 };
}

function buildRobot(type: RobotType, color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4, emissive: color, emissiveIntensity: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f1f2a, metalness: 0.5, roughness: 0.5 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (type === 'mobile') {
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 32), body, 0, 0.16, 0);
    add(new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 0.27, 0);
    add(new THREE.BoxGeometry(0.1, 0.08, 0.2), dark, 0.3, 0.2, 0);
  } else if (type === 'arm') {
    add(new THREE.CylinderGeometry(0.3, 0.36, 0.18, 32), dark, 0, 0.09, 0);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16), body, 0, 0.53, 0);
    add(new THREE.BoxGeometry(0.55, 0.1, 0.1), body, 0.27, 0.88, 0);
    add(new THREE.SphereGeometry(0.08, 16, 16), dark, 0.55, 0.88, 0);
  } else {
    add(new THREE.BoxGeometry(0.7, 0.2, 0.5), body, 0, 0.16, 0);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 16), dark, -0.1, 0.48, 0);
    add(new THREE.BoxGeometry(0.4, 0.07, 0.07), body, 0.1, 0.7, 0);
    add(new THREE.BoxGeometry(0.1, 0.06, 0.18), dark, 0.34, 0.24, 0);
  }
  return g;
}

const VIEW_DIRECTION = new THREE.Vector3(0.1, 0.72, 0.78).normalize();

/** Places the camera so a world of the given span fits the viewport at any aspect ratio. */
function fitCamera(camera: THREE.PerspectiveCamera, controls: OrbitControls, span: number) {
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const distance = Math.max((span * 0.62) / Math.tan(vHalf), (span * 0.75) / Math.tan(hHalf));
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance);
  controls.target.set(0, 0, 0);
  controls.update();
}

function disposeGroup(group: THREE.Object3D) {
  group.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(m => m.dispose());
    else mat?.dispose();
  });
}

export default function SimulationViewer({ world, jobs }: SimulationViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refs = useRef<SceneRefs | null>(null);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // One-time renderer, camera, lights and render loop.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0e);
    scene.fog = new THREE.Fog(0x0b0b0e, 40, 90);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;
    // Wheel zoom only after the user clicks the viewer, so page scrolling isn't hijacked.
    controls.enableZoom = false;
    const enableZoom = () => (controls.enableZoom = true);
    const disableZoom = () => (controls.enableZoom = false);
    canvas.addEventListener('pointerdown', enableZoom);
    canvas.addEventListener('pointerleave', disableZoom);

    scene.add(new THREE.HemisphereLight(0xbcb8ff, 0x101018, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 });
    scene.add(sun);

    const content = new THREE.Group();
    scene.add(content);
    refs.current = { renderer, scene, camera, controls, content, robots: [] };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const span = content.userData.span as number | undefined;
      if (span) fitCamera(camera, controls, span);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const r = refs.current!;
      const now = Date.now();
      const w = r.content.userData as { width: number; height: number };
      for (const robot of r.robots) {
        const job = jobsRef.current.find(j => j.id === robot.jobId);
        if (!job) continue;
        const pose = currentPose(job, now);
        robot.mesh.position.set(pose.x - (w.width - 1) / 2, 0, pose.y - (w.height - 1) / 2);
        robot.mesh.rotation.y = -pose.heading;
      }
      r.controls.update();
      r.renderer.render(r.scene, r.camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', enableZoom);
      canvas.removeEventListener('pointerleave', disableZoom);
      controls.dispose();
      disposeGroup(scene);
      renderer.dispose();
      refs.current = null;
    };
  }, []);

  // Rebuild the world, paths and robots when the selection or planned paths change.
  const pathKey = jobs.map(j => `${j.id}:${j.path?.length ?? 0}`).join('|');
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    disposeGroup(r.content);
    r.content.clear();
    r.robots = [];
    r.content.userData = { width: world.width, height: world.height };

    const ox = (world.width - 1) / 2;
    const oz = (world.height - 1) / 2;
    const toScene = (x: number, y: number, h = 0) => new THREE.Vector3(x - ox, h, y - oz);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(world.width, world.height),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-0.5 + world.width / 2 - ox, 0, -0.5 + world.height / 2 - oz);
    floor.receiveShadow = true;
    r.content.add(floor);

    const grid = new THREE.GridHelper(Math.max(world.width, world.height), Math.max(world.width, world.height), 0x2a2a3a, 0x1a1a24);
    grid.position.copy(floor.position).setY(0.002);
    r.content.add(grid);

    if (world.obstacles.length) {
      const boxes = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.9, 1),
        new THREE.MeshStandardMaterial({ color: 0x4a4a62, roughness: 0.6, metalness: 0.1 }),
        world.obstacles.length
      );
      const m = new THREE.Matrix4();
      world.obstacles.forEach((o, i) => {
        m.setPosition(toScene(o.x, o.y, 0.45));
        boxes.setMatrixAt(i, m);
      });
      boxes.castShadow = true;
      boxes.receiveShadow = true;
      r.content.add(boxes);
    }

    const primary = jobs[0];
    if (primary) {
      const startRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide }));
      startRing.rotation.x = -Math.PI / 2;
      startRing.position.copy(toScene(primary.start.x, primary.start.y, 0.01));
      r.content.add(startRing);

      const goalMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.6 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), goalMat);
      pole.position.copy(toScene(primary.goal.x, primary.goal.y, 0.6));
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), goalMat);
      flag.position.copy(toScene(primary.goal.x + 0.2, primary.goal.y, 1.05));
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.copy(toScene(primary.goal.x, primary.goal.y, 0.01));
      r.content.add(pole, flag, pad);
    }

    jobs.forEach((job, i) => {
      const color = ALGORITHM_COLORS[job.algorithm];
      if (job.path && job.path.length > 1) {
        const curve = new THREE.CurvePath<THREE.Vector3>();
        const lift = 0.04 + i * 0.015;
        for (let k = 1; k < job.path.length; k++) {
          curve.add(new THREE.LineCurve3(toScene(job.path[k - 1].x, job.path[k - 1].y, lift), toScene(job.path[k].x, job.path[k].y, lift)));
        }
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, Math.min(job.path.length * 4, 1200), 0.05, 6, false),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: i === 0 ? 0.95 : 0.7 })
        );
        r.content.add(tube);
      }
      const mesh = buildRobot(job.robotType, color);
      r.content.add(mesh);
      r.robots.push({ jobId: job.id, mesh });
    });

    r.content.userData.span = Math.max(world.width, world.height);
    fitCamera(r.camera, r.controls, r.content.userData.span);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pathKey]);

  return <canvas ref={canvasRef} className="block h-[360px] w-full md:h-[480px]" />;
}
