import { Vec3 } from "../modules/vec3.js";
import { julianCenturies } from "./obliquity.js";

// Precession Matrix Lieske, and Meeus
export function precessionAngles(jd: number): {
  zeta: number;
  z: number;
  theta: number;
} {
  const T = julianCenturies(jd);
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600;
  const theta =
    (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600;
  return { zeta, z, theta };
}

export function precessEquatorialJ2000ToDate(
  v: Vec3,
  jd: number
): Vec3 {
  const { zeta, z: zz, theta } = precessionAngles(jd);
  return v.rotZ(zeta).rotY(-theta).rotZ(zz);
}

export function precessEquatorialDateToJ2000(
  v: Vec3,
  jd: number
): Vec3 {
  const { zeta, z: zz, theta } = precessionAngles(jd);
  return v.rotZ(-zz).rotY(theta).rotZ(-zeta);
}