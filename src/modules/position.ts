import type { Vec3 } from "./vec3.js";

export type Origin = "sun" | "earth" | "moon" | "barycenter";

export type System = "ecliptic" | "equatorial";

export type CelestialFrame = "j2000" | "mean-of-date" | "true-of-date";

export type Orientation = "fixed" | "mean" | "true";

export type Reference = {
  readonly frame: CelestialFrame;
  readonly orientation: Orientation;
};

export const meanEclipticOfDate: Reference = {
  frame: "mean-of-date",
  orientation: "mean",
} as const;
export const meanEquatorialOfDate: Reference = {
  frame: "mean-of-date",
  orientation: "mean",
} as const;
export const eclipticJ2000: Reference = {
  frame: "j2000",
  orientation: "fixed",
} as const;
export const equatorialJ2000: Reference = {
  frame: "j2000",
  orientation: "fixed",
} as const;
export const trueEclipticOfDate: Reference = {
  frame: "true-of-date",
  orientation: "true",
} as const;
export const trueEquatorialOfDate: Reference = {
  frame: "true-of-date",
  orientation: "true",
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
  readonly system: System;
  readonly reference: Reference;
};

export type CartesianPosition = Position & {
  readonly representation: Cartesian;
};
export type SphericalPosition = Position & {
  readonly representation: Spherical;
};
