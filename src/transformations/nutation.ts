import { cos, sin } from "../math/trigonometry.js";
import { julianCenturies, meanObliquity } from "./obliquity.js";

// Meeus 23.1 (short series), results in degrees.
export function nutationAngles(jd: number): { dpsi: number; deps: number } {
  const T = julianCenturies(jd);
  const Omega = 125.04452 - 1934.136261 * T; // longitude of ascending node of lunar orbit
  const L = 280.4665 + 36000.7698 * T; // Sun mean longitude
  const Lp = 218.3165 + 481267.8813 * T; // Moon mean longitude

  const dpsiArcsec =
    -17.2 * sin(Omega) -
    1.32 * sin(2 * L) -
    0.23 * sin(2 * Lp) +
    0.21 * sin(2 * Omega);
  const depsArcsec =
    9.2 * cos(Omega) +
    0.57 * cos(2 * L) +
    0.1 * cos(2 * Lp) -
    0.09 * cos(2 * Omega);

  return { dpsi: dpsiArcsec / 3600, deps: depsArcsec / 3600 };
}

export function trueObliquity(jd: number): number {
  return meanObliquity(jd) + nutationAngles(jd).deps;
}