"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Local Vector3 type to avoid missing import
type Vector3 = { x: number; y: number; z: number };

export default function SimulationViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [robotPosition, setRobotPosition] = useState<Vector3>({ x: 0, y: 0, z: 0 });
  const [targetPosition, setTargetPosition] = useState<Vector3>({ x: 5, y: 5, z: 0 });
  const [collisions, setCollisions] = useState(0);
  const [pathEfficiency, setPathEfficiency] = useState(0);
  const [energyUsed, setEnergyUsed] = useState(0);
  const sceneRef = useRef<any>(null);
  const robotMeshRef = useRef<any>(null);
  const targetMeshRef = useRef<any>(null);
  const pathLineRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Dynamic import for Three.js
    import("three").then((THREE) => {
      const width = canvasRef.current!.clientWidth;
      const height = canvasRef.current!.clientHeight;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(8, 8, 8);
      camera.lookAt(0, 0, 0);

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      // Grid
      const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
      scene.add(gridHelper);

      // Robot (sphere)
      const robotGeometry = new THREE.SphereGeometry(0.3, 32, 32);
      const robotMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
      const robotMesh = new THREE.Mesh(robotGeometry, robotMaterial);
      robotMesh.position.set(robotPosition.x, robotPosition.y, robotPosition.z);
      scene.add(robotMesh);
      robotMeshRef.current = robotMesh;

      // Target (cube)
      const targetGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const targetMaterial = new THREE.MeshStandardMaterial({ color: 0x10b981 });
      const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
      targetMesh.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
      scene.add(targetMesh);
      targetMeshRef.current = targetMesh;

      // Path line
      const pathGeometry = new THREE.BufferGeometry();
      const pathMaterial = new THREE.LineBasicMaterial({ color: 0xa78bfa, linewidth: 2 });
      const pathLine = new THREE.Line(pathGeometry, pathMaterial);
      scene.add(pathLine);
      pathLineRef.current = pathLine;

      // Animation loop
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        if (!canvasRef.current) return;
        const newWidth = canvasRef.current.clientWidth;
        const newHeight = canvasRef.current.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    });
  }, []);

  useEffect(() => {
    if (robotMeshRef.current) {
      robotMeshRef.current.position.set(robotPosition.x, robotPosition.y, robotPosition.z);
    }
  }, [robotPosition]);

  useEffect(() => {
    if (targetMeshRef.current) {
      targetMeshRef.current.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    }
  }, [targetPosition]);

  const handlePlaySimulation = () => {
    setIsRunning(true);
    let time = 0;
    const startTime = Date.now();

    const simulate = () => {
      time = (Date.now() - startTime) / 1000;
      setSimulationTime(time);

      // Move robot towards target
      const direction = {
        x: targetPosition.x - robotPosition.x,
        y: targetPosition.y - robotPosition.y,
        z: targetPosition.z - robotPosition.z,
      };

      const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);

      if (distance > 0.1) {
        const speed = 2; // units per second
        const step = (speed * 0.016) / distance; // ~60fps

        setRobotPosition((prev) => ({
          x: prev.x + direction.x * step,
          y: prev.y + direction.y * step,
          z: prev.z + direction.z * step,
        }));

        // Update metrics
        setPathEfficiency(Math.min(100, 50 + time * 10));
        setEnergyUsed(time * 0.5);

        animationIdRef.current = requestAnimationFrame(simulate);
      } else {
        setIsRunning(false);
      }
    };

    simulate();
  };

  const handlePause = () => {
    setIsRunning(false);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSimulationTime(0);
    setRobotPosition({ x: 0, y: 0, z: 0 });
    setCollisions(0);
    setPathEfficiency(0);
    setEnergyUsed(0);
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Simulation Viewer</CardTitle>
          <CardDescription>Real-time 3D visualization of robot movements</CardDescription>
        </CardHeader>
        <CardContent>
          <canvas ref={canvasRef} className="h-96 w-full rounded-lg border border-border bg-input" />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Button onClick={handlePlaySimulation} disabled={isRunning} className="bg-primary hover:bg-primary/90">
              Play Simulation
            </Button>
            <Button onClick={handlePause} disabled={!isRunning} variant="outline" className="border-border bg-transparent">
              Pause
            </Button>
            <Button onClick={handleReset} variant="outline" className="border-border bg-transparent">
              Reset
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Target Position</Label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="X"
                  value={targetPosition.x}
                  onChange={(e) => setTargetPosition({ ...targetPosition, x: Number.parseFloat(e.target.value) })}
                  className="rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={targetPosition.y}
                  onChange={(e) => setTargetPosition({ ...targetPosition, y: Number.parseFloat(e.target.value) })}
                  className="rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={targetPosition.z}
                  onChange={(e) => setTargetPosition({ ...targetPosition, z: Number.parseFloat(e.target.value) })}
                  className="rounded border border-border bg-input px-2 py-1 text-sm text-foreground"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Simulation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-input p-4">
              <p className="text-sm text-muted-foreground">Execution Time</p>
              <p className="text-2xl font-bold text-accent">{simulationTime.toFixed(2)} s</p>
            </div>
            <div className="rounded-lg bg-input p-4">
              <p className="text-sm text-muted-foreground">Collisions Detected</p>
              <p className="text-2xl font-bold text-accent">{collisions}</p>
            </div>
            <div className="rounded-lg bg-input p-4">
              <p className="text-sm text-muted-foreground">Path Efficiency</p>
              <p className="text-2xl font-bold text-accent">{pathEfficiency.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-input p-4">
              <p className="text-sm text-muted-foreground">Energy Used</p>
              <p className="text-2xl font-bold text-accent">{energyUsed.toFixed(2)} J</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
