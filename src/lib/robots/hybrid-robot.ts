import { Robot } from './robot';
import type { RobotOptions } from './types';

export class HybridRobot extends Robot {
  constructor(options: RobotOptions) {
    super({ ...options, type: 'hybrid' });
  }

  // This would combine mobile and arm path planning
  planPath(): void {
    console.log(`Planning path for hybrid robot ${this.name}...`);
  }
}
