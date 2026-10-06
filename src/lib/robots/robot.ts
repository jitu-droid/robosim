import type { RobotOptions, RobotType } from './types';

export abstract class Robot {
  private _id: string;
  private _name: string;
  private _type: RobotType;

  constructor(options: RobotOptions & { type: RobotType }) {
    this._id = options.id;
    this._name = options.name;
    this._type = options.type;
  }

  // Encapsulation: using getters to access private properties
  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get type(): RobotType {
    return this._type;
  }

  // Abstraction: defining a common method that subclasses must implement
  // Polymorphism: this method will have different implementations in subclasses
  abstract planPath(): void;
}
