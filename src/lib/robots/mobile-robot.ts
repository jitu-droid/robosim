import { Robot } from './robot';
import type { RobotOptions } from './types';

export class MobileRobot extends Robot {
  constructor(options: RobotOptions) {
    super({ ...options, type: 'mobile' });
  }

  // This would be specific to a mobile robot's movement
  planPath(): void {
    console.log(`Planning path for mobile robot ${this.name}...`);
  }
}
