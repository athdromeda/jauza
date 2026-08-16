import type { Vec3 } from "../types.js";

enum Frame {
  ICRS,
  ECLIPTIC,
  EQUATORIAL,
}

export class Position {
  constructor(vec3: Vec3, frame: Frame) {}
}
