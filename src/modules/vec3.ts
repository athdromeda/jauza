import { cos, sin } from "../math/trigonometry.js";

export class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(other: Vec3): Vec3 {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  sub(other: Vec3): Vec3 {
    return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  rotX(angle: number): Vec3 {
    const c = cos(angle);
    const s = sin(angle);
    return new Vec3(this.x, this.y * c - this.z * s, this.y * s + this.z * c);
  }

  rotY(angle: number): Vec3 {
    const c = cos(angle);
    const s = sin(angle);
    return new Vec3(this.x * c + this.z * s, this.y, -this.x * s + this.z * c);
  }

  rotZ(angle: number): Vec3 {
    const c = cos(angle);
    const s = sin(angle);
    return new Vec3(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
  }
}

