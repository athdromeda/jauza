import { describe, it, expect } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Moon } from "../../../src/modules/moon.js";
import { Time } from "../../../src/modules/time.js";
import {
  equatorialJ2000,
  trueEclipticOfDate,
} from "../../../src/modules/position.js";
import { Vec3 } from "../../../src/modules/vec3.js";
import type { AlgoConfig, LegacyBodyConfig } from "../../../src/types.js";
import type {
  AlgorithmAdapter,
  ExtendedAlgorithmMetadata,
  TransformationEdge,
} from "../../../src/contract.js";

const epoch = () => new Time(2000, 1, 1, 12);

const sunBody = (
  geocentric: { ra: number; dec: number },
  apparent?: { ra: number; dec: number }
): LegacyBodyConfig => ({
  outputType: "EQUATORIAL",
  origin: "earth",
  system: "equatorial",
  reference: equatorialJ2000,
  distanceUnit: "km",
  formula: () => ({ lambda: geocentric.ra, beta: geocentric.dec, r: 150_000_000 }),
  ...(apparent
    ? {
        apparentFormula: () => ({
          lambda: apparent.ra,
          beta: apparent.dec,
          r: 150_000_000,
        }),
      }
    : {}),
});

const aberration: TransformationEdge = {
  from: { system: "ecliptic", reference: trueEclipticOfDate, center: "earth" },
  to: { system: "ecliptic", reference: trueEclipticOfDate, center: "earth" },
  cost: 0.1,
  correction: "annual-aberration",
  label: "test aberration",
  apply: (v: Vec3) => v.rotZ(-5),
};

const adapter = (
  sun: LegacyBodyConfig,
  transformations?: TransformationEdge[]
): AlgoConfig => {
  const metadata: ExtendedAlgorithmMetadata = {
    timeScale: "UTC",
    epoch: "j2000",
    corrections: [],
    ...(transformations ? { transformations } : {}),
  };
  return {
    name: "dedicated-apparent-fixture",
    metadata,
    bodies: ["SUN"],
    SUN: sun,
  } as AlgorithmAdapter;
};

const observeSun = (algo: AlgoConfig) =>
  new Earth(0, 0, 0).at(epoch()).with(algo).observe(Sun);

describe("Body dedicated apparent source", () => {
  it("keeps geometric() on the geometric formula", () => {
    const e = observeSun(adapter(sunBody({ ra: 10, dec: 0 }, { ra: 25, dec: 10 })));
    expect(e.geometric().ra.decimal).toBeCloseTo(10, 0);
    expect(e.geometric().dec.decimal).toBeCloseTo(0, 0);
  });

  it("uses apparentFormula for apparent RA/Dec", () => {
    const e = observeSun(adapter(sunBody({ ra: 10, dec: 0 }, { ra: 25, dec: 10 })));
    expect(e.ra.decimal).toBeCloseTo(25, 0);
    expect(e.dec.decimal).toBeCloseTo(10, 0);
  });

  it("falls back to the geometric pipeline when no apparentFormula exists", () => {
    const e = observeSun(adapter(sunBody({ ra: 10, dec: 0 })));
    expect(e.geometric().ra.decimal).toBeCloseTo(10, 0);
    expect(e.ra.decimal).toBeCloseTo(10, 0);
    expect(e.dec.decimal).toBeCloseTo(0, 0);
  });

  it("drives horizontal coordinates from the apparent vector", () => {
    const apparent = observeSun(
      adapter(sunBody({ ra: 10, dec: 0 }, { ra: 25, dec: 10 }))
    );
    const equivalentLegacy = observeSun(adapter(sunBody({ ra: 25, dec: 10 })));
    const geometricOnly = observeSun(adapter(sunBody({ ra: 10, dec: 0 })));

    expect(Math.abs(apparent.alt - geometricOnly.alt)).toBeGreaterThan(5);
    expect(apparent.alt).toBeCloseTo(equivalentLegacy.alt, 6);
    expect(apparent.az).toBeCloseTo(equivalentLegacy.az, 6);
  });

  it("does not re-apply metadata corrections on a dedicated apparent source", () => {
    const dedicated = observeSun(
      adapter(sunBody({ ra: 10, dec: 0 }, { ra: 10, dec: 0 }), [aberration])
    );
    const legacy = observeSun(adapter(sunBody({ ra: 10, dec: 0 }), [aberration]));

    expect(dedicated.ra.decimal).toBeCloseTo(10, 0);
    expect(legacy.ra.decimal).toBeCloseTo(5, 0);
  });

  it("applies to the Moon as well", () => {
    const moon: LegacyBodyConfig = {
      outputType: "EQUATORIAL",
      origin: "earth",
      system: "equatorial",
      reference: equatorialJ2000,
      distanceUnit: "km",
      formula: () => ({ lambda: 100, beta: 5, r: 384_400 }),
      apparentFormula: () => ({ lambda: 110, beta: 5, r: 384_400 }),
    };
    const algo = {
      name: "dedicated-apparent-fixture",
      bodies: ["MOON"],
      MOON: moon,
    } as AlgoConfig;
    const e = new Earth(0, 0, 0).at(epoch()).with(algo).observe(Moon);
    expect(e.geometric().ra.decimal).toBeCloseTo(100, 0);
    expect(e.ra.decimal).toBeCloseTo(110, 0);
  });
});
