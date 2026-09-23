import { describe, it, expect } from "vitest";
import {
  eclipticJ2000,
  equatorialJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEquatorialOfDate,
  type Position,
  type Reference,
  type System,
} from "../../../src/modules/position.js";
import { toSpherical } from "../../../src/modules/transform.js";
import type { SphericalPosition } from "../../../src/modules/position.js";
import { normalizeAngle } from "../../../src/math/unit.js";
import { cos, sin, tan } from "../../../src/math/trigonometry.js";
import { meanObliquity } from "../../../src/transformations/obliquity.js";
import { nutationAngles } from "../../../src/transformations/nutation.js";
import { toFrame } from "../../../src/frames/convert.js";

const J2000_OBLIQUITY = 84381.448 / 3600;

const sph = (
  system: System,
  reference: Reference,
  lon: number,
  lat: number,
  r = 1
): SphericalPosition => ({
  representation: { kind: "spherical", lon, lat, r },
  origin: "sun",
  system,
  reference,
});

const lonOf = (p: Position) => toSpherical(p).representation.lon;
const latOf = (p: Position) => toSpherical(p).representation.lat;

describe("toFrame known-answer cases", () => {
  it("converts equatorial J2000 to equatorial of date (Meeus/PyMeeus theta Persei)", () => {
    // J2000: a = 2h44m11.986s, d = +49°13'42.48"; at JD 2462088.69 (2028-11-13.19)
    // PyMeeus pure precession: a' = 41.543086, d' = 49.349207
    const p = sph(
      "equatorial",
      equatorialJ2000,
      (2 + 44 / 60 + 11.986 / 3600) * 15,
      49 + 13 / 60 + 42.48 / 3600
    );
    const out = toFrame(p, "equatorial", meanEquatorialOfDate, 2462088.69);
    expect(out.system).toBe("equatorial");
    expect(out.reference).toEqual(meanEquatorialOfDate);
    expect(lonOf(out)).toBeCloseTo(41.543086, 5);
    expect(latOf(out)).toBeCloseTo(49.349207, 5);
  });

  it("converts ecliptic J2000 to equatorial J2000 using the J2000 obliquity", () => {
    // (lambda=90, beta=0) -> alpha=90, delta=epsilon_J2000 = 23.439291111
    const p = sph("ecliptic", eclipticJ2000, 90, 0);
    const out = toFrame(p, "equatorial", equatorialJ2000, 2451545.0);
    expect(out.reference).toEqual(equatorialJ2000);
    expect(lonOf(out)).toBeCloseTo(90, 8);
    expect(latOf(out)).toBeCloseTo(J2000_OBLIQUITY, 8);
  });

  it("converts ecliptic of date to equatorial of date using the mean obliquity", () => {
    const jd = 2461041.5;
    const expectedEps = meanEpsilon(jd);
    const p = sph("ecliptic", meanEclipticOfDate, 90, 0, 1);
    const out = toFrame(p, "equatorial", meanEquatorialOfDate, jd);
    expect(out.reference).toEqual(meanEquatorialOfDate);
    expect(lonOf(out)).toBeCloseTo(90, 8);
    expect(latOf(out)).toBeCloseTo(expectedEps, 8);
  });

  it("apparent equatorial of date equals mean-of-date + nutation differentials (Meeus 23)", () => {
    const jd = 2448908.5; // 1992-04-12.0, matches the meeus-moon fixture epoch
    const { dpsi, deps } = nutationAngles(jd);
    const p = sph("equatorial", meanEquatorialOfDate, 123.45, 12.3, 1);
    const out = toFrame(p, "equatorial", trueEquatorialOfDate, jd);
    const src = toSpherical(p);
    const a = src.representation.lon;
    const d = src.representation.lat;
    const eps = meanObliquity(jd);
    const da =
      dpsi * (cos(eps) + sin(eps) * sin(a) * tan(d)) - deps * cos(a) * tan(d);
    const dd = dpsi * sin(eps) * cos(a) + deps * sin(a);
    expect(lonOf(out)).toBeCloseTo(normalizeAngle(a + da, 0, 360), 8);
    expect(latOf(out)).toBeCloseTo(d + dd, 8);
  });
});

function meanEpsilon(jd: number): number {
  // Meeus 22.2, degrees (independent of src/frames/obliquity.ts)
  const T = (jd - 2451545.0) / 36525;
  return (84381.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}