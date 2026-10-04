import { describe, it, expect } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Time } from "../../../src/modules/time.js";
import { Sun } from "../../../src/modules/sun.js";
import { trueEclipticOfDate, trueEquatorialOfDate } from "../../../src/modules/position.js";
import { equatorialToHorizontal } from "../../../src/math/astrometry.js";
import { normalizeHour } from "../../../src/math/unit.js";
import type { AlgoConfig } from "../../../src/types.js";

const jd = 2460676.5;
const lat = -6.1;
const lng = 106.8;

const nativeAlgo = (eclLon: number, eclLat: number): AlgoConfig => ({
  name: `native-${eclLon}`,
  bodies: ["SUN"],
  SUN: {
    outputType: "MULTI_SPHERICAL",
    origin: "earth",
    distanceUnit: "au",
    formula: () => ({
      r: 1,
      primary: { system: "ecliptic", reference: trueEclipticOfDate },
      coordinates: [
        {
          system: "ecliptic",
          reference: trueEclipticOfDate,
          longitude: eclLon,
          latitude: eclLat,
        },
        {
          system: "equatorial",
          reference: trueEquatorialOfDate,
          longitude: 47,
          latitude: 12,
        },
      ],
    }),
  },
});

describe("Earth.horizontal", () => {
  it("uses the published native equatorial pair, not a hard-coded-23.5° ecliptic conversion", () => {
    const a = new Earth(lat, lng, 0).at(new Time(jd)).observe(Sun).with(nativeAlgo(90, 0));
    const b = new Earth(lat, lng, 0).at(new Time(jd)).observe(Sun).with(nativeAlgo(180, 20));
    // Same native equatorial pair (ra=47°, dec=12°) ⇒ same alt/az regardless of ecliptic primary.
    expect(a.alt).toBeCloseTo(b.alt, 9);
    expect(a.az).toBeCloseTo(b.az, 9);

    const lst = normalizeHour(a.time.gast + lng / 15);
    const ha = lst * 15 - a.ra.decimal;
    const expected = equatorialToHorizontal({ ra: a.ra, dec: a.dec }, lat, ha);
    expect(a.alt).toBeCloseTo(expected.alt.decimal, 9);
    expect(a.az).toBeCloseTo(expected.az.decimal, 9);
  });

  it("derives horizontal from frame-graph RA/Dec and apparent sidereal time (legacy path)", () => {
    const algo: AlgoConfig = {
      name: "legacy-ecliptic",
      bodies: ["SUN"],
      SUN: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "ecliptic",
        reference: trueEclipticOfDate,
        distanceUnit: "au",
        formula: () => ({ lambda: 90, beta: 0, r: 1 }),
      },
    };
    const obs = new Earth(lat, lng, 0).at(new Time(jd)).observe(Sun).with(algo);
    const lst = normalizeHour(obs.time.gast + lng / 15);
    const ha = lst * 15 - obs.ra.decimal;
    const expected = equatorialToHorizontal({ ra: obs.ra, dec: obs.dec }, lat, ha);
    expect(obs.alt).toBeCloseTo(expected.alt.decimal, 9);
    expect(obs.az).toBeCloseTo(expected.az.decimal, 9);
    // True-of-date obliquity is ~23.44°, not the old 23.5° constant.
    expect(Math.abs(obs.dec.decimal - 23.436)).toBeLessThan(0.01);
  });
});