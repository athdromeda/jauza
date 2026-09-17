import { describe, it, expect } from "vitest";
import {
  eclipticJ2000,
  equatorialJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
  type Position,
  type Reference,
  type System,
} from "../modules/position.js";
import { toSpherical } from "../modules/transform.js";
import type { SphericalPosition } from "../modules/position.js";
import { normalizeAngle } from "../math/unit.js";
import { cos, sin, tan } from "../math/trigonometry.js";
import { meanObliquity } from "../transformations/obliquity.js";
import { nutationAngles } from "../transformations/nutation.js";
import { toFrame } from "./convert.js";

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

describe("toFrame", () => {
  it("returns the position unchanged when system and reference match", () => {
    const p = sph("ecliptic", meanEclipticOfDate, 100, 20, 3);
    expect(toFrame(p, "ecliptic", meanEclipticOfDate, 2451545.0)).toBe(p);
  });

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

describe("toFrame round-trips", () => {
  it("round-trips all system/reference pairs to the starting position", () => {
    const pairs: Array<[System, Reference]> = [
      ["ecliptic", meanEclipticOfDate],
      ["equatorial", meanEquatorialOfDate],
      ["ecliptic", eclipticJ2000],
      ["equatorial", equatorialJ2000],
      ["ecliptic", trueEclipticOfDate],
      ["equatorial", trueEquatorialOfDate],
    ];
    const samples: Array<[number, number, number]> = [
      [120, 30, 2],
      [5, -60, 0.5],
      [200, 80, 1.4],
      [55, -12, 2.5],
    ];
    const jd = 2461041.5;
    for (const [system, reference] of pairs) {
      for (const [lon, lat, r] of samples) {
        const p = sph(system, reference, lon, lat, r);
        for (const [targetSystem, targetReference] of pairs) {
          const round = toFrame(
            toFrame(p, targetSystem, targetReference, jd),
            system,
            reference,
            jd
          );
          const diff = Math.abs(lonOf(round) - lon) % 360;
          // nutation differential is first-order -> second-order round-trip
          // residuals ~6e-6 deg (sub-0.05 arcsec); tolerate 1e-5.
          expect(Math.min(diff, 360 - diff)).toBeLessThan(1e-5);
          expect(latOf(round)).toBeCloseTo(lat, 5);
          expect(toSpherical(round).representation.r).toBeCloseTo(r, 9);
        }
      }
    }
  });
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

  it("round-trips all six references through true-of-date", () => {
    const refs: Array<[System, Reference]> = [
      ["ecliptic", meanEclipticOfDate],
      ["equatorial", meanEquatorialOfDate],
      ["ecliptic", eclipticJ2000],
      ["equatorial", equatorialJ2000],
      ["ecliptic", trueEclipticOfDate],
      ["equatorial", trueEquatorialOfDate],
    ];
    const seeds: Array<[System, Reference]> = [
      ["ecliptic", trueEclipticOfDate],
      ["equatorial", trueEquatorialOfDate],
      ["ecliptic", meanEclipticOfDate],
      ["equatorial", equatorialJ2000],
    ];
    const jd = 2462088.69;
    for (const [sys, ref] of seeds) {
      const p = sph(sys, ref, 55, -12, 2.5);
      for (const [targetSystem, g] of refs) {
        const round = toFrame(toFrame(p, targetSystem, g, jd), sys, ref, jd);
        const diff = Math.abs(lonOf(round) - p.representation.lon) % 360;
        expect(Math.min(diff, 360 - diff)).toBeLessThan(1e-5);
        expect(latOf(round)).toBeCloseTo(p.representation.lat, 5);
      }
    }
  });
});

function meanEpsilon(jd: number): number {
  // Meeus 22.2, degrees (independent of src/frames/obliquity.ts)
  const T = (jd - 2451545.0) / 36525;
  return (84381.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}