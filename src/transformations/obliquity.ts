export const J2000_JD = 2451545.0;

// Mean obliquity of the ecliptic at J2000 (Meeus 22.2, from 84381.448").
export const J2000_OBLIQUITY = 84381.448 / 3600;

export function julianCenturies(jd: number): number {
  return (jd - J2000_JD) / 36525;
}

// Meeus 22.2: e0 = 23°26'21.448" - 46.8150"T - 0.00059"T^2 + 0.001813"T^3
export function meanObliquity(jd: number): number {
  const T = julianCenturies(jd);
  const arcsec =
    84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return arcsec / 3600;
}

export { trueObliquity } from "./nutation.js";