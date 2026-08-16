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
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  sub(other: Vec3): Vec3 {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }
}
