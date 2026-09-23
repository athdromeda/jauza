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
} from "../../../src/modules/position.js";
import { toSpherical } from "../../../src/modules/transform.js";
import type { SphericalPosition } from "../../../src/modules/position.js";
import { toFrame } from "../../../src/frames/convert.js";

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
});