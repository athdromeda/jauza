import { describe, it, expect } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import { eclipticJ2000 } from "../../../src/modules/position.js";
import type { AlgoConfig, DistanceUnit } from "../../../src/types.js";

const AU_KM = 149597870.7;

// Sun at origin with r=0, Earth at 1 au. Observed geocentric distance = 1 au.
// The target (SUN) is an origin marker: the distance magnitude comes from the
// observer's formula (EARTH), so the converting unit must come from EARTH.
const base: AlgoConfig = {
  name: "fixture-distance",
  bodies: ["SUN", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 0, b: 0, r: 0 }),
    distanceUnit: "au",
  },
  EARTH: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 100, b: 0, r: 1 }),
    distanceUnit: "au",
  },
};

const withObserverUnit = (distanceUnit: DistanceUnit): AlgoConfig => ({
  ...base,
  EARTH: { ...base.EARTH!, distanceUnit },
});

const withTargetUnit = (distanceUnit: DistanceUnit): AlgoConfig => ({
  ...base,
  SUN: { ...base.SUN!, distanceUnit },
});

// Geocentric sun: the target formula itself yields the distance (r=1), so the
// converting unit comes from the target's config.
const geocentric: AlgoConfig = {
  name: "fixture-geocentric",
  bodies: ["SUN"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ lambda: 100, beta: 0, r: 1 }),
    distanceUnit: "au",
  },
};

describe("Body r canonicalization", () => {
  it("converts an au-declared r to km", () => {
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(withObserverUnit("au"))
      .observe(Sun);

    expect(e.geometric().r).toBeCloseTo(AU_KM, 1);
    expect(e.r).toBeCloseTo(AU_KM, 1);
    expect(e.ecliptic.r).toBeCloseTo(AU_KM, 1);
  });

  it("derives the unit from the observer's config when the target is an origin marker", () => {
    // EARTH says km, SUN (marker) says au. The distance comes from EARTH's
    // formula, so r=1 must be interpreted as km and stay 1 — not convert to AU_KM.
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(withObserverUnit("km"))
      .observe(Sun);

    expect(e.geometric().r).toBeCloseTo(1, 9);
  });

  it("still converts when the unit is declared only on the target marker body", () => {
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(withTargetUnit("au"))
      .observe(Sun);

    expect(e.geometric().r).toBeCloseTo(AU_KM, 1);
  });

  it("uses the target's config unit when the target formula produces the distance", () => {
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(geocentric)
      .observe(Sun);

    expect(e.geometric().r).toBeCloseTo(AU_KM, 1);
  });

  it("exposes an always-km rKm on the geometric view", () => {
    const e = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(withObserverUnit("au"))
      .observe(Sun);

    expect(e.geometric().rKm).toBeCloseTo(AU_KM, 1);
  });
});