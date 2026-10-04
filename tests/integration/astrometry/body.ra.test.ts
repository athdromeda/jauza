import { describe, it, expect } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import { eclipticJ2000 } from "../../../src/modules/position.js";
import { normalizeAngle } from "../../../src/math/unit.js";
import type { AlgoConfig, LegacyBodyConfig } from "../../../src/types.js";

// Observed Sun at ecliptic longitude ~198° (the 1992-10-13 case from the jpl-de
// note): `atan2` yields a principal value of ~-162°, which is the same angle as
// ~198° wrapped. `lambda` is normalized to [0, 360); `ra` must be too.
const raSun: LegacyBodyConfig = {
  outputType: "ECLIPTIC",
  origin: "sun",
  system: "ecliptic",
  reference: eclipticJ2000,
  formula: () => ({ l: 0, b: 0, r: 0 }),
  distanceUnit: "au",
};

const raEarth: LegacyBodyConfig = {
  outputType: "ECLIPTIC",
  origin: "sun",
  system: "ecliptic",
  reference: eclipticJ2000,
  formula: () => ({ l: 18.38, b: 0, r: 1 }),
  distanceUnit: "au",
};

const raFixture: AlgoConfig = {
  name: "fixture-ra",
  bodies: ["SUN", "EARTH"],
  SUN: raSun,
  EARTH: raEarth,
};

describe("Body.ra / geometric().ra normalization", () => {
  it("wraps RA to [0, 360) like lambda", () => {
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(1992, 10, 13, 0))
      .with(raFixture)
      .observe(Sun);

    const lam = e.geometric().lambda.decimal;
    const ra = e.geometric().ra.decimal;
    const raApparent = e.ra.decimal;

    expect(lam).toBeGreaterThan(180);
    expect(lam).toBeLessThan(360);
    // RA represents the same direction as lambda (beta ~ 0), so after wrapping
    // the two must agree to within a few degrees — never be 180° apart.
    expect(Math.abs(normalizeAngle(ra, 0, 360) - lam)).toBeLessThan(10);
    expect(Math.abs(normalizeAngle(raApparent, 0, 360) - lam)).toBeLessThan(10);
  });

  it("keeps RA within [0, 360) across quadrants", () => {
    for (const l of [10, 100, 190, 280, 350]) {
      const algo: AlgoConfig = {
        ...raFixture,
        EARTH: {
          ...raEarth,
          formula: () => ({ l, b: 0, r: 1 }),
        },
      };
      const e = new Earth([0, 0], [0, 0], 0)
        .at(new Time(2000, 1, 1, 12))
        .with(algo)
        .observe(Sun);
      const ra = e.geometric().ra.decimal;
      expect(ra).toBeGreaterThanOrEqual(0);
      expect(ra).toBeLessThan(360);
    }
  });
});