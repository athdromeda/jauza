import { describe, it, expect } from "vitest";
import { Earth, Sun, Moon, Time } from "../../../src/index.js";
import { eclipticJ2000, equatorialJ2000 } from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

const AU_KM = 149597870.7;
const MOON_KM = 384400;

// Sun publishes AU, Moon publishes km. Both geocentric at lon=0/lat=0.
const mixedUnits: AlgoConfig = {
  name: "fixture-mixed-units",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "MULTI_SPHERICAL",
    origin: "earth",
    distanceUnit: "au",
    formula: () => ({
      r: 1,
      primary: { system: "ecliptic", reference: eclipticJ2000 },
      coordinates: [
        { system: "ecliptic", reference: eclipticJ2000, longitude: 0, latitude: 0 },
        { system: "equatorial", reference: equatorialJ2000, longitude: 0, latitude: 0 },
      ],
    }),
  },
  MOON: {
    outputType: "MULTI_SPHERICAL",
    origin: "earth",
    distanceUnit: "km",
    formula: () => ({
      r: MOON_KM,
      primary: { system: "ecliptic", reference: eclipticJ2000 },
      coordinates: [
        { system: "ecliptic", reference: eclipticJ2000, longitude: 0, latitude: 0 },
        { system: "equatorial", reference: equatorialJ2000, longitude: 0, latitude: 0 },
      ],
    }),
  },
};

const REL_KM = AU_KM - MOON_KM; // 149,213,470.7 km — the true relative distance

describe("mixed-unit origin arithmetic", () => {
  it("Moon observing Sun returns ~1 AU minus the lunar distance (km)", () => {
    const m = Moon(new Time(2000, 1, 1, 12)).observe(Sun).with(mixedUnits);
    expect(m.geometric().rKm).toBeCloseTo(REL_KM, 1);
    expect(m.geometric().r).toBeCloseTo(REL_KM, 1);
  });

  it("Sun observing Moon returns the same km relative distance", () => {
    const s = Sun(new Time(2000, 1, 1, 12)).observe(Moon).with(mixedUnits);
    expect(s.geometric().rKm).toBeCloseTo(REL_KM, 1);
  });

  it("Earth geocenter observing Moon sees the lunar distance in km", () => {
    const e = Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(mixedUnits)
      .observe(Moon);
    expect(e.geometric().rKm).toBeCloseTo(MOON_KM, 1);
  });
});