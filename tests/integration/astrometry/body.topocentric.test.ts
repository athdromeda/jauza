import { describe, expect, it } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Moon } from "../../../src/modules/moon.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import { trueEquatorialOfDate } from "../../../src/modules/position.js";
import { TopocentricPositionError } from "../../../src/math/topocentric.js";
import { asin, cos, sin } from "../../../src/math/trigonometry.js";
import { normalizeAngle } from "../../../src/math/unit.js";
import type { AlgoConfig } from "../../../src/types.js";

const jd = 2460676.5;

const equatorialBody = (rKm: number): AlgoConfig => ({
  name: "fixture-equatorial",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "au",
    formula: ({ jd: _jd }) => ({ lambda: 90, beta: 0, r: 149597870.7 / rKm }),
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: ({ jd: _jd }) => ({ lambda: 90, beta: 0, r: rKm }),
  },
});

const nearHorizonAlgo = (raDeg: number): AlgoConfig => ({
  name: "fixture-horizon",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "au",
    formula: () => ({ lambda: raDeg, beta: 0, r: 1 }),
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: raDeg, beta: 0, r: 384400 }),
  },
});

const geocentricAlt = (raDeg: number, decDeg: number, lat: number, lstHours: number) => {
  const ha = lstHours * 15 - raDeg;
  return asin(sin(decDeg) * sin(lat) + cos(decDeg) * cos(lat) * cos(ha));
};

describe("Earth topocentric horizontal", () => {
  it("lowers a lunar-distance target near the horizon by its horizontal parallax (~0.95°)", () => {
    const obs = new Earth(0, 0, 0).at(new Time(jd));
    const lst = obs.time.gast;
    // Place the Moon near the eastern geocentric horizon: HA ≈ -90°, dec 0.
    const ra = normalizeAngle(lst * 15 + 90, 0, 360);
    const moon = new Earth(0, 0, 0)
      .at(new Time(jd))
      .observe(Moon)
      .with(nearHorizonAlgo(ra));

    const geo = geocentricAlt(ra, 0, 0, lst);
    expect(Math.abs(geo)).toBeLessThan(0.02);
    const parallax = Math.abs(geo - moon.alt);
    expect(parallax).toBeGreaterThan(0.8);
    expect(parallax).toBeLessThan(1.1);
  });

  it("shifts a solar-distance target by only the solar parallax (~8.8″)", () => {
    const obs = new Earth(0, 0, 0).at(new Time(jd));
    const lst = obs.time.gast;
    const ra = normalizeAngle(lst * 15 + 90, 0, 360);
    const sun = new Earth(0, 0, 0)
      .at(new Time(jd))
      .observe(Sun)
      .with(nearHorizonAlgo(ra));

    const geo = geocentricAlt(ra, 0, 0, lst);
    expect(Math.abs(geo - sun.alt)).toBeLessThan(0.01);
  });

  it("throws a typed error when the target has no valid distance", () => {
    const zeroAlgo: AlgoConfig = {
      name: "fixture-zero-distance",
      bodies: ["MOON"],
      MOON: {
        outputType: "MULTI_SPHERICAL",
        origin: "earth",
        distanceUnit: "km",
        formula: () => ({
          r: 0,
          primary: { system: "equatorial", reference: trueEquatorialOfDate },
          coordinates: [
            {
              system: "equatorial",
              reference: trueEquatorialOfDate,
              longitude: 90,
              latitude: 0,
            },
          ],
        }),
      },
    };

    const moon = new Earth(0, 0, 0).at(new Time(jd)).observe(Moon).with(zeroAlgo);
    expect(() => moon.alt).toThrow(TopocentricPositionError);
  });

  it("leaves geocentric RA/Dec unchanged after reading horizontal coordinates", () => {
    const moon = new Earth(0, 0, 0)
      .at(new Time(jd))
      .observe(Moon)
      .with(nearHorizonAlgo(90));
    const raBefore = moon.ra.decimal;
    const decBefore = moon.dec.decimal;
    void moon.alt;
    void moon.az;
    expect(moon.ra.decimal).toBe(raBefore);
    expect(moon.dec.decimal).toBe(decBefore);
  });
});