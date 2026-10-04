import { describe, it, expect } from "vitest";
import {
  computeHilalDetails,
  findConjunction,
  moonLongitude,
  sunLongitude,
} from "../../../src/utils/conjunction.js";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Moon } from "../../../src/modules/moon.js";
import { Time } from "../../../src/modules/time.js";
import {
  eclipticJ2000,
  meanEclipticOfDate,
  trueEclipticOfDate,
  type Position,
  type Reference,
} from "../../../src/modules/position.js";
import { equatorialToHorizontal } from "../../../src/math/astrometry.js";
import { normalizeHour } from "../../../src/math/unit.js";
import { toFrame } from "../../../src/frames/convert.js";
import { toSpherical } from "../../../src/modules/transform.js";
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

  it("reports a topocentric lunar altitude (geocentric minus parallax) in the hilal pipeline", () => {
    const res = computeHilalDetails(sunStub, moonStub(3), observer, baseResult);
    const moon = new Earth(observer.lat, observer.lng, observer.h)
      .at(res.sunset)
      .observe(Moon)
      .with(moonStub(3));

    const lst = normalizeHour(moon.time.gast + observer.lng / 15);
    const ha = lst * 15 - moon.ra.decimal;
    const geocentric = equatorialToHorizontal(
      { ra: moon.ra, dec: moon.dec },
      observer.lat,
      ha
    );
    // The thin crescent is near the sun (and therefore the horizon) at sunset, so
    // the topocentric altitude is lower than the geocentric one by ~the lunar
    // horizontal parallax (~0.95°). The pipeline must NOT be geocentric.
    const parallax = geocentric.alt.decimal - res.moonAlt.decimal;
    expect(parallax).toBeGreaterThan(0.6);
    expect(parallax).toBeLessThan(1.2);
  });

  it("handles a below-sea-level observer without producing NaN", () => {
    const deadSea = new Earth(31.5, 35.5, -430);
    const res = computeHilalDetails(sunStub, moonStub(3), deadSea, baseResult);
    expect(Number.isFinite(res.sunset.jd)).toBe(true);
    expect(Number.isFinite(res.moonset.jd)).toBe(true);
    expect(Number.isFinite(res.moonAlt.decimal)).toBe(true);
    expect(Number.isFinite(res.sunAzimuth.decimal)).toBe(true);
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
          primary: { system: "ecliptic", reference: meanEclipticOfDate },
          coordinates: [
            {
              system: "ecliptic",
              reference: meanEclipticOfDate,
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

describe("conjunction frame consistency", () => {
  const meanEclipticPosition = (
    jd: number,
    lon: number,
    lat: number,
    r: number
  ): Position => ({
    representation: { kind: "spherical", lon, lat, r },
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
  });

  const moonAlgo = (
    reference: Reference,
    toPrimary: (jd: number) => Position
  ): AlgoConfig => ({
    name: `moon-${reference.frame}`,
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
      outputType: "MULTI_SPHERICAL",
      origin: "earth",
      distanceUnit: "km",
      formula: ({ jd }) => {
        const pos = toPrimary(jd);
        const sph = toSpherical(pos).representation;
        return {
          r: sph.r,
          primary: { system: pos.system, reference: pos.reference },
          coordinates: [
            {
              system: pos.system,
              reference: pos.reference,
              longitude: sph.lon,
              latitude: sph.lat,
            },
          ],
        };
      },
    },
  });

  it("solves the same conjunction epoch whether the moon primary is j2000 or mean-of-date", () => {
    const anchor = new Time(2025, 6, 1).jd;
    const rate = 13.0;
    const moonLon = (jd: number) => (jd - anchor) * rate;

    const meanAlgo = moonAlgo(meanEclipticOfDate, (jd) =>
      meanEclipticPosition(jd, moonLon(jd), 0, 384400)
    );

    const j2000Algo = moonAlgo(eclipticJ2000, (jd) =>
      toFrame(
        meanEclipticPosition(jd, moonLon(jd), 0, 384400),
        "ecliptic",
        eclipticJ2000,
        jd
      )
    );

    const meanRes = findConjunction(meanAlgo, meanAlgo, anchor);
    const j2000Res = findConjunction(j2000Algo, j2000Algo, anchor);

    expect(j2000Res.jde).toBeCloseTo(meanRes.jde, 4);
  });

  it("reduces a true-of-date ecliptic primary to the mean ecliptic of date", () => {
    const jd = 2451545;
    const truePos = toFrame(
      meanEclipticPosition(jd, 102, 0, 384400),
      "ecliptic",
      trueEclipticOfDate,
      jd
    );
    const sph = toSpherical(truePos).representation;

    const algo: AlgoConfig = {
      name: "moon-true",
      bodies: ["MOON"],
      MOON: {
        outputType: "MULTI_SPHERICAL",
        origin: "earth",
        distanceUnit: "km",
        formula: () => ({
          r: sph.r,
          primary: { system: "ecliptic", reference: trueEclipticOfDate },
          coordinates: [
            {
              system: "ecliptic",
              reference: trueEclipticOfDate,
              longitude: sph.lon,
              latitude: sph.lat,
            },
          ],
        }),
      },
    };

    const expected = toSpherical(
      toFrame(truePos, "ecliptic", meanEclipticOfDate, jd)
    ).representation.lon;

    expect(moonLongitude(algo, jd)).toBeCloseTo(expected, 9);
  });

  it("reduces a legacy ecliptic j2000 primary to the mean ecliptic of date", () => {
    const jd = new Time(2025, 6, 1).jd;
    const j2000Pos = toFrame(
      meanEclipticPosition(jd, 100, 0, 1),
      "ecliptic",
      eclipticJ2000,
      jd
    );
    const j2000Sph = toSpherical(j2000Pos).representation;

    const algo: AlgoConfig = {
      name: "legacy-sun-j2000",
      bodies: ["SUN"],
      SUN: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "ecliptic",
        reference: eclipticJ2000,
        distanceUnit: "au",
        formula: () => ({ lambda: j2000Sph.lon, beta: j2000Sph.lat, r: 1 }),
      },
    };

    const expected = toSpherical(
      toFrame(j2000Pos, "ecliptic", meanEclipticOfDate, jd)
    ).representation.lon;

    expect(sunLongitude(algo, jd)).toBeCloseTo(expected, 8);
  });
});