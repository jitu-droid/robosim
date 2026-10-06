'use client';

import { useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ROBOT_TYPE_LABELS, type RobotType, type SoftwareSuite } from '@/lib/robomaker/types';
import RobotIcon from './robot-icon';
import { CopyText, EmptyState, FieldLabel, Panel, SectionHeader, timeAgo } from './shared';

export default function RobotsSection() {
  const { state, createRobotApp, publishRobotAppVersion, deleteRobotApp } = useRoboMaker();
  const { toast } = useToast();
  const now = useNow(5000);

  const [name, setName] = useState('');
  const [type, setType] = useState<RobotType>('mobile');
  const [suite, setSuite] = useState<SoftwareSuite>('ROS2 Humble');
  const [maxSpeed, setMaxSpeed] = useState('1.5');
  const [maxAccel, setMaxAccel] = useState('1');

  const speed = Number(maxSpeed);
  const accel = Number(maxAccel);
  const nameTaken = state.robotApps.some(a => a.name.toLowerCase() === name.trim().toLowerCase());
  const errors = {
    name: !name.trim() ? 'Name is required' : !/^[a-zA-Z0-9_\- ]+$/.test(name.trim()) ? 'Letters, numbers, - and _ only' : nameTaken ? 'Name already exists' : null,
    speed: !(speed > 0 && speed <= 5) ? 'Between 0 and 5 m/s' : null,
    accel: !(accel > 0 && accel <= 5) ? 'Between 0 and 5 m/s²' : null,
  };
  const valid = !errors.name && !errors.speed && !errors.accel;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const app = createRobotApp({ name, type, softwareSuite: suite, maxSpeed: speed, maxAcceleration: accel });
    toast({ title: 'Robot application created', description: app.arn });
    setName('');
  };

  return (
    <section id="robots" className="page-section opacity-0 transform translate-y-[30px] transition-opacity duration-1000 ease-out">
      <SectionHeader
        icon="🤖"
        title="Robot Applications"
        subtitle="The software that runs on your robot. Each job pins the version it was launched with."
        apis={['CreateRobotApplication', 'CreateRobotApplicationVersion', 'DeleteRobotApplication']}
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-5">
            <p className="font-semibold">Create robot application</p>
            <div>
              <FieldLabel htmlFor="robot-name">Name</FieldLabel>
              <Input id="robot-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Delivery-Bot" />
              {name && errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Robot type</FieldLabel>
                <Select value={type} onValueChange={v => setType(v as RobotType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROBOT_TYPE_LABELS) as RobotType[]).map(t => (
                      <SelectItem key={t} value={t}>
                        {ROBOT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Software suite</FieldLabel>
                <Select value={suite} onValueChange={v => setSuite(v as SoftwareSuite)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['ROS2 Humble', 'ROS2 Foxy', 'General'] as SoftwareSuite[]).map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="max-speed">Max speed (m/s)</FieldLabel>
                <Input id="max-speed" type="number" step="0.1" value={maxSpeed} onChange={e => setMaxSpeed(e.target.value)} />
                {errors.speed && <p className="mt-1 text-xs text-red-400">{errors.speed}</p>}
              </div>
              <div>
                <FieldLabel htmlFor="max-accel">Max accel (m/s²)</FieldLabel>
                <Input id="max-accel" type="number" step="0.1" value={maxAccel} onChange={e => setMaxAccel(e.target.value)} />
                {errors.accel && <p className="mt-1 text-xs text-red-400">{errors.accel}</p>}
              </div>
            </div>
            <Button type="submit" disabled={!valid} className="w-full bg-foreground py-6 font-bold text-background hover:bg-white/80">
              ✨ Create robot application
            </Button>
          </form>
        </Panel>

        <div className="lg:col-span-3 space-y-3">
          {state.robotApps.length === 0 ? (
            <EmptyState icon="🤖" title="No robot applications yet">
              Create one to start running simulation jobs.
            </EmptyState>
          ) : (
            state.robotApps.map(app => {
              const jobsUsing = state.jobs.filter(j => j.robotAppId === app.id).length;
              return (
                <div key={app.id} className="rounded-lg border border-border p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <RobotIcon type={app.type} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{app.name}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">v{app.version}</span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{app.softwareSuite}</span>
                      </div>
                      <CopyText text={app.arn} className="mt-1" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ROBOT_TYPE_LABELS[app.type]} · {app.maxSpeed} m/s · {app.maxAcceleration} m/s² · {jobsUsing} job{jobsUsing === 1 ? '' : 's'} ·
                        updated {timeAgo(app.updatedAt, now)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Publish new version"
                        onClick={() => {
                          publishRobotAppVersion(app.id);
                          toast({ title: `Published ${app.name} v${app.version + 1}` });
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete robot application ${app.name}? Existing jobs keep their snapshot.`)) deleteRobotApp(app.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
