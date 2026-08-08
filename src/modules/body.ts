import { type Algo, type Vec3 } from "../types.js";

export class Body {
  time: Date = new Date();
  sourceVec: Vec3 = [0, 0, 0];
  targetVec: Vec3 = [0, 0, 0];
  algo: Algo | null = null;

  constructor(time: Date) {
    this.time = time;
  }

  observe(BodyClass: new (time: Date) => Body) {
    const target = new BodyClass(this.time);
    this.targetVec = [
      target.sourceVec[0],
      target.sourceVec[1],
      target.sourceVec[2],
    ];

    return this;
  }

  at(time: Date) {
    this.time = time;
    return this;
  }

  with(algo: Algo) {
    this.algo = algo;
    this.sourceVec = algo(this.time);
    return this;
  }
}
