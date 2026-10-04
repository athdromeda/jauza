import { describe, it, expect } from "vitest";
import {
  computeHilalDetails,
  findConjunction,
  moonLongitude,
  sunLongitude,
} from "../../../src/utils/conjunction.js";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import {
  meanEclipticOfDate,
  trueEclipticOfDate,
} from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

const sunStub: AlgoConfig = {
  name: "fixture-sun",
  bodies: ["SUN", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    distanceUnit: "au",
    formula: () => ({ lambda: 0, beta: 0, r: 1 }),
  },
};

const moonStub = (elongationDeg: number): AlgoConfig => ({
  name: "fixture-moon",
  bodies: ["MOON"],
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: elongationDeg, beta: 0, r: 384400 }),
  },
});

const observer = new Earth(-6.1, 106.8, 0);
const baseResult = {
  jde: 2461118.55989,
  ut: 2461118.55902,
  moonLon: 3,
  sunLon: 0,
};

const SUN_SD_1AU = (Math.asin(696000 / 149597870.7) * 180) / Math.PI;

describe("computeHilalDetails", () => {
  it("reports a small illuminated fraction for a thin crescent (1 − cos)/2", () => {
    const res = computeHilalDetails(sunStub, moonStub(3), observer, baseResult);
    const expected = ((1 - Math.cos((3 * Math.PI) / 180)) / 2) * 100;
    expect(res.illumination).toBeCloseTo(expected, 6);
    expect(res.illumination).toBeLessThan(1);
  });

  it("finds sunset where the sun's center sits at the mar'i horizon (SD + 34.5′ + dip)", () => {
    const res = computeHilalDetails(sunStub, moonStub(3), observer, baseResult);
    const sun = new Earth(observer.lat, observer.lng, observer.h)
      .at(res.sunset)
      .observe(Sun)
      .with(sunStub);
    const expectedTarget = -(SUN_SD_1AU + 34.5 / 60);
    // brent's root is accurate to ~0.35s on the steep altitude slope (~360°/day),
    // so accept ~0.005°. This still separates the book's target (-0.8416°) from
    // the old -0.833 - 0.0347·√h convention (-0.833°, Δ ≈ 0.0086°).
    expect(sun.alt).toBeCloseTo(expectedTarget, 2);
  });
});

describe("findConjunction reported epoch", () => {
  it("reports jde = ut + (TT−UTC) using leap seconds, not ΔT", () => {
    const anchor = new Time(2025, 6, 1).jd;
    const linAlgo: AlgoConfig = {
      name: "lin-moon",
      bodies: ["SUN", "MOON"],
      SUN: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "ecliptic",
        reference: meanEclipticOfDate,
        distanceUnit: "au",
        formula: () => ({ lambda: 0, beta: 0, r: 1 }),
      },
      MOON: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "ecliptic",
        reference: meanEclipticOfDate,
        distanceUnit: "km",
        formula: ({ jd }) => ({ lambda: jd - anchor, beta: 0, r: 384400 }),
      },
    };
    const res = findConjunction(linAlgo, linAlgo, anchor);
    expect(res.ut).toBeGreaterThan(anchor - 1);
    expect(res.ut).toBeLessThan(anchor + 1);
    // 2025: TAI−UTC = 37 → TT−UTC = 69.184 s. Old behavior was ΔT ≈ 74.5 s.
    expect((res.jde - res.ut) * 86400).toBeCloseTo(37 + 32.184, 2);
  });
});

describe("longitude readers", () => {
  it("uses the primary ecliptic coordinates from multi-coordinate output", () => {
    const algo: AlgoConfig = {
      name: "multi-conjunction-fixture",
      bodies: ["SUN", "MOON"],
      SUN: {
        outputType: "MULTI_SPHERICAL",
        origin: "earth",
        distanceUnit: "au",
        formula: () => ({
          r: 1,
          primary: { system: "ecliptic", reference: meanEclipticOfDate },
          coordinates: [
            {
              system: "ecliptic",
              reference: meanEclipticOfDate,
              longitude: 100,
              latitude: 0,
            },
            {
              system: "equatorial",
              reference: trueEclipticOfDate,
              longitude: 999,
              latitude: 0,
            },
          ],
        }),
      },
      MOON: {
        outputType: "MULTI_SPHERICAL",
        origin: "earth",
        distanceUnit: "km",
        formula: () => ({
          r: 384400,
          primary: { system: "ecliptic", reference: trueEclipticOfDate },
          coordinates: [
            {
              system: "ecliptic",
              reference: trueEclipticOfDate,
              longitude: 102,
              latitude: 5,
            },
          ],
        }),
      },
    };

    expect(sunLongitude(algo, 2451545)).toBe(100);
    expect(moonLongitude(algo, 2451545)).toBe(102);
  });
});