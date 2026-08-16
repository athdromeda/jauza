import { asin, atan2, cos, sin } from "../math/trigonometry.js";
import { Vec3 } from "./vec3.js";

export class Representation {
  type: "cartesian" | "spherical";
  #vec3: Vec3;

  constructor(vector: Vec3, type: "cartesian" | "spherical") {
    this.#vec3 = vector;
    this.type = type;
  }

  toCartesian(): Representation {
    if (this.type === "cartesian") {
      return this;
    }

    const { x, y, z } = this.#vec3;
    const xVal = z * cos(y) * cos(x);
    const yVal = z * cos(y) * sin(x);
    const zVal = z * sin(y);

    this.#vec3 = new Vec3(xVal, yVal, zVal);
    this.type = "cartesian";
    return this;
  }

  toSpherical(): Representation {
    if (this.type === "spherical") {
      return this;
    }

    const { x, y, z } = this.#vec3;
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = asin(z / r);
    const lon = atan2(y, x);

    this.#vec3 = new Vec3(lon, lat, r);
    this.type = "spherical";
    return this;
  }

  get vec3(): Vec3 {
    return this.#vec3;
  }
}
