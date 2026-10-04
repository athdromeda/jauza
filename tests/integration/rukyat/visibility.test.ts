import { describe, expect, expectTypeOf, it } from "vitest";
import { DMS, HMS } from "../../../src/modules/angle.js";
import { Earth } from "../../../src/modules/earth.js";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { trueEquatorialOfDate } from "../../../src/modules/position.js";
import { Time } from "../../../src/modules/time.js";
import type { AlgoConfig } from "../../../src/types.js";
import type { RukyatData } from "../../../src/utils/conjunction.js";
import { odeh, yallop } from "../../../src/utils/visibility.js";

const AU_KM = 149597870.7;

// Shared algorithm: custom conjunction and hilal, but real Sun/Moon positions
// and distances so the best-time geometry can be computed independently.
const syntheticAlgo = (): AlgoConfig => ({
  name: "synthetic-visible-crescent",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: 90, beta: 0, r: AU_KM }),
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: 96, beta: 0, r: 384400 }),
  },
  conjunction: () => ({
    jde: 2461118.55989,
    ut: 2461118.55902,
    moonLon: 358,
    sunLon: 358,
  }),
  hilal: () => {
    const sunset = new Time(2461118.5);
    const moonset = new Time(2461118.5 + 60 / 1440);
    const data: RukyatData = {
      sunset,
      sunAzimuth: new DMS(270),
      moonAlt: new DMS(4),
      moonAzimuth: new DMS(265),
      moonPosition: new DMS(5),
      elongation: new DMS(6),
      crescentCondition: "Tilted North",
      lag: new HMS(1),
      moonset,
      moonsetAzimuth: new DMS(263),
      illumination: 0.5,
      age: new HMS(10),
    };
    return data;
  },
});

const observer = new Earth(-6, 106, 0);

describe("Rukyat.visibility", () => {
  it("evaluates geometry at best time sunset plus four ninths of lag", () => {
    const result = new Rukyat(1447, 1)
      .at(observer)
      .with(syntheticAlgo())
      .visibility();

    expect(result.sunset.jd).toBeCloseTo(2461118.5, 10);
    expect(result.moonset.jd).toBeCloseTo(2461118.5 + 60 / 1440, 10);
    expect(result.geometry.time.jd).toBeCloseTo(
      result.sunset.jd + (4 / 9) * (result.moonset.jd - result.sunset.jd),
      10
    );
  });

  it("reports the real lunar distance used by the geometry", () => {
    const result = new Rukyat(1447, 1)
      .at(observer)
      .with(syntheticAlgo())
      .visibility();
    expect(result.geometry.moon.distanceKm).toBeCloseTo(384400, 0);
  });

  it("classifies from the returned geometry exactly as the pure models do", () => {
    const result = new Rukyat(1447, 1)
      .at(observer)
      .with(syntheticAlgo())
      .visibility();

    expect(result.yallop.q).toBeCloseTo(
      yallop({
        arcvDeg: result.geometry.geocentric.arcvDeg,
        crescentWidthArcmin: result.geometry.yallopWidthArcmin,
      }).q,
      12
    );
    expect(result.odeh.v).toBeCloseTo(
      odeh({
        arcvDeg: result.geometry.topocentric.arcvDeg,
        crescentWidthArcmin: result.geometry.odehWidthArcmin,
      }).v,
      12
    );
  });

  it("returns scores and zones, not just boolean flags", () => {
    const result = new Rukyat(1447, 1)
      .at(observer)
      .with(syntheticAlgo())
      .visibility();
    expect(Number.isFinite(result.yallop.q)).toBe(true);
    expect(result.yallop.zone.length).toBe(1);
    expect(Number.isFinite(result.odeh.v)).toBe(true);
    expect(result.odeh.zone.length).toBe(1);
    expect(typeof result.newMabims).toBe("boolean");
    expect(typeof result.diyanet).toBe("boolean");
    expect(typeof result.danjon).toBe("boolean");
  });

  it("keeps the danjonLimit option", () => {
    const rukyat = () =>
      new Rukyat(1447, 1).at(observer).with(syntheticAlgo());
    expect(() => rukyat().visibility({ danjonLimit: 5 })).not.toThrow();
    // Synthetic elongation is 6°; a limit of 5° passes it, the default 7° does not.
    expect(rukyat().visibility({ danjonLimit: 5 }).danjon).toBe(true);
    expect(rukyat().visibility().danjon).toBe(false);
  });

  it("rejects manual override options at the type level", () => {
    const rukyat = new Rukyat(1447, 1).at(observer).with(syntheticAlgo());
    if (false) {
      // @ts-expect-error manual ARCV overrides were intentionally removed
      rukyat.visibility({ arcv: 1 });
      // @ts-expect-error manual width overrides were intentionally removed
      rukyat.visibility({ w: 1 });
      // @ts-expect-error manual topocentric-width overrides were intentionally removed
      rukyat.visibility({ wPrime: 1 });
    }
    expectTypeOf(rukyat.visibility).parameter(0).toBeNullable();
  });
});