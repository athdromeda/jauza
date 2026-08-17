import type { Vec3 } from "./vec3.js";

export type Origin = "sun" | "earth" | "moon" | "barycenter";

export type Frame = {
  readonly type: "ecliptic" | "equatorial";
  readonly equinox: "date" | "J2000";
};

export const eclipticOfDate: Frame = {
  type: "ecliptic",
  equinox: "date",
} as const;
export const equatorialOfDate: Frame = {
  type: "equatorial",
  equinox: "date",
} as const;

export type Cartesian = { readonly kind: "cartesian"; readonly vec3: Vec3 };
export type Spherical = {
  readonly kind: "spherical";
  readonly lon: number;
  readonly lat: number;
  readonly r: number;
};

export type Position = {
  readonly representation: Cartesian | Spherical;
  readonly origin: Origin;
  readonly frame: Frame;
};

export type CartesianPosition = Position & {
  readonly representation: Cartesian;
};
export type SphericalPosition = Position & {
  readonly representation: Spherical;
};
