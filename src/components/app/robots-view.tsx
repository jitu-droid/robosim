'use client';

import { useState } from 'react';
import { Bot, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNow, useRoboMaker } from '@/lib/robomaker/store';
import { ROBOT_TYPE_LABELS, type RobotApplication, type RobotType, type SoftwareSuite } from '@/lib/robomaker/types';
import RobotIcon from './robot-icon';
import { Card, ConfirmDialog, CopyText, EmptyState, FieldError, FieldLabel, PageHeader, plural, timeAgo } from './shared';

const SUITES: SoftwareSuite[] = ['ROS2 Humble', 'ROS2 Foxy', 'General'];

export default function RobotsView() {
  const { state, publishRobotAppVersion, deleteRobotApp } = useRoboMaker();
  const { toast } = useToast();
  const now = useNow(5000);
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<RobotApplication | null>(null);

  return (
    <>
      <PageHeader
        title="Robot applications"
        description="The software that runs on your robot. A simulation job pins the application version it was launched with, so publishing a new version never changes past results."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Create robot application
          </Button>
        }
      />

      {state.robotApps.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No robot applications"
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Create robot application
            </Button>
          }
        >
          Create one to start running simulation jobs.
        </EmptyState>
      ) : (
        <Card>
          <TooltipProvider delayDuration={200}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pl-4 pr-3 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Software suite</th>
                    <th className="px-3 py-2.5 font-medium">Version</th>
                    <th className="px-3 py-2.5 font-medium">Motion limits</th>
                    <th className="px-3 py-2.5 font-medium">Jobs</th>
                    <th className="px-3 py-2.5 font-medium">Updated</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {state.robotApps.map(app => {
                    const jobs = state.jobs.filter(j => j.robotAppId === app.id).length;
                    return (
                      <tr key={app.id} className="border-b border-border/60 last:border-0">
                        <td className="max-w-[260px] py-3 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <RobotIcon type={app.type} className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{app.name}</p>
                              <CopyText text={app.arn} />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{ROBOT_TYPE_LABELS[app.type]}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{app.softwareSuite}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">v{app.version}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground">
                          {app.maxSpeed} m/s · {app.maxAcceleration} m/s²
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">{jobs}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{timeAgo(app.updatedAt, now)}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Publish new version"
                                  onClick={() => {
                                    publishRobotAppVersion(app.id);
                                    toast({ title: `Published ${app.name} v${app.version + 1}` });
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Publish version {app.version + 1}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" aria-label="Delete" onClick={() => setToDelete(app)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        </Card>
      )}

      <CreateRobotDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description={
          toDelete
            ? `${plural(state.jobs.filter(j => j.robotAppId === toDelete.id).length, 'existing job')} keep their own snapshot of this application. New jobs can no longer use it.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => toDelete && deleteRobotApp(toDelete.id)}
      />
    </>
  );
}

function CreateRobotDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, createRobotApp } = useRoboMaker();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<RobotType>('mobile');
  const [suite, setSuite] = useState<SoftwareSuite>('ROS2 Humble');
  const [maxSpeed, setMaxSpeed] = useState('1.5');
  const [maxAccel, setMaxAccel] = useState('1');
  const [touched, setTouched] = useState(false);

  const speed = Number(maxSpeed);
  const accel = Number(maxAccel);
  const trimmed = name.trim();
  const errors = {
    name: !trimmed
      ? 'Enter a name'
      : !/^[a-zA-Z0-9_\- ]+$/.test(trimmed)
        ? 'Use letters, numbers, spaces, - and _'
        : state.robotApps.some(a => a.name.toLowerCase() === trimmed.toLowerCase())
          ? 'An application with this name already exists'
          : null,
    speed: !(speed > 0 && speed <= 5) ? 'Must be between 0 and 5 m/s' : null,
    accel: !(accel > 0 && accel <= 5) ? 'Must be between 0 and 5 m/s²' : null,
  };
  const valid = !errors.name && !errors.speed && !errors.accel;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const app = createRobotApp({ name: trimmed, type, softwareSuite: suite, maxSpeed: speed, maxAcceleration: accel });
    toast({ title: 'Robot application created', description: app.name });
    setName('');
    setTouched(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create robot application</DialogTitle>
            <DialogDescription>Equivalent to CreateRobotApplication. The first version is published automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-5">
            <div>
              <FieldLabel htmlFor="robot-name">Name</FieldLabel>
              <Input id="robot-name" value={name} onChange={e => setName(e.target.value)} placeholder="Delivery-Bot" autoFocus />
              <FieldError>{(touched || name) && errors.name}</FieldError>
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
                    {SUITES.map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="max-speed" hint="m/s">
                  Max speed
                </FieldLabel>
                <Input id="max-speed" type="number" step="0.1" value={maxSpeed} onChange={e => setMaxSpeed(e.target.value)} />
                <FieldError>{errors.speed}</FieldError>
              </div>
              <div>
                <FieldLabel htmlFor="max-accel" hint="m/s²">
                  Max acceleration
                </FieldLabel>
                <Input id="max-accel" type="number" step="0.1" value={maxAccel} onChange={e => setMaxAccel(e.target.value)} />
                <FieldError>{errors.accel}</FieldError>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
