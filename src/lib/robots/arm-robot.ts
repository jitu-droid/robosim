import { Robot } from './robot';
import type { RobotOptions } from './types';

export class ArmRobot extends Robot {
  constructor(options: RobotOptions) {
    super({ ...options, type: 'arm' });
  }

  // In a real scenario, this would involve inverse kinematics
  planPath(): void {
    console.log(`Planning path for arm robot ${this.name}...`);
  }
}
