import { describe, expect, it } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Moon } from "../../../src/modules/moon.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import {
  eclipticJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
} from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

const nativeAlgo: AlgoConfig = {
  name: "native-coordinate-fixture",
  bodies: ["SUN"],
  SUN: {
    outputType: "MULTI_SPHERICAL",
    origin: "earth",
    distanceUnit: "au",
    formula: () => ({
      r: 1,
      primary: {
        system: "ecliptic",
        reference: meanEclipticOfDate,
      },
      coordinates: [
        {
          system: "ecliptic",
          reference: meanEclipticOfDate,
          longitude: 10,
          latitude: 1,
        },
        {
          system: "equatorial",
          reference: trueEquatorialOfDate,
          longitude: 42,
          latitude: -7,
        },
      ],
    }),
  },
};

describe("Body native coordinates", () => {
  it("returns exact native true-equatorial RA/Dec", () => {
    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(nativeAlgo)
      .observe(Sun);

    expect(sun.ra.decimal).toBe(42);
    expect(sun.dec.decimal).toBe(-7);
    expect(
      sun.explainCoordinates("equatorial", trueEquatorialOfDate).steps
    ).toEqual([
      expect.objectContaining({
        label: "native-coordinate-fixture native coordinates",
        metadata: { source: "native-table" },
      }),
    ]);
  });

  it("returns exact native mean ecliptic coordinates for geometric ecliptic", () => {
    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(nativeAlgo)
      .observe(Sun);

    expect(sun.geometric().ecliptic.reference).toEqual(meanEclipticOfDate);
    expect(sun.geometric().ecliptic.l.decimal).toBe(10);
    expect(sun.geometric().ecliptic.b.decimal).toBe(1);
  });

  it("derives true ecliptic coordinates because only mean ecliptic is native", () => {
    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(nativeAlgo)
      .observe(Sun);

    expect(sun.ecliptic.reference.frame).toBe("true-of-date");
    expect(
      sun.explainCoordinates("ecliptic", sun.ecliptic.reference).steps
    ).not.toEqual([
      expect.objectContaining({ metadata: { source: "native-table" } }),
    ]);
  });

  it("does not reuse heliocentric native RA/Dec after translating to Earth", () => {
    const translatedAlgo: AlgoConfig = {
      name: "translated-native-fixture",
      bodies: ["SUN", "EARTH"],
      SUN: {
        outputType: "MULTI_SPHERICAL",
        origin: "sun",
        distanceUnit: "au",
        formula: () => ({
          r: 0,
          primary: { system: "ecliptic", reference: eclipticJ2000 },
          coordinates: [
            {
              system: "ecliptic",
              reference: eclipticJ2000,
              longitude: 0,
              latitude: 0,
            },
            {
              system: "equatorial",
              reference: trueEquatorialOfDate,
              longitude: 42,
              latitude: -7,
            },
          ],
        }),
      },
      EARTH: {
        outputType: "ECLIPTIC",
        origin: "sun",
        system: "ecliptic",
        reference: eclipticJ2000,
        distanceUnit: "au",
        formula: () => ({ l: 100, b: 0, r: 1 }),
      },
    };

    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(translatedAlgo)
      .observe(Sun);

    expect(sun.ra.decimal).not.toBe(42);
    expect(sun.dec.decimal).not.toBe(-7);
    expect(
      sun.explainCoordinates("equatorial", trueEquatorialOfDate).steps
    ).not.toEqual([
      expect.objectContaining({ metadata: { source: "native-table" } }),
    ]);
  });

  it("does not reuse native coordinates when the observer has an offset at the same origin", () => {
    const offsetObserverAlgo: AlgoConfig = {
      name: "offset-observer-fixture",
      bodies: ["SUN", "EARTH"],
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
              longitude: 10,
              latitude: 1,
            },
            {
              system: "equatorial",
              reference: trueEquatorialOfDate,
              longitude: 42,
              latitude: -7,
            },
          ],
        }),
      },
      EARTH: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "ecliptic",
        reference: meanEclipticOfDate,
        distanceUnit: "au",
        formula: () => ({ l: 0.5, b: 0, r: 0.0001 }),
      },
    };

    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(offsetObserverAlgo)
      .observe(Sun);

    expect(sun.ra.decimal).not.toBe(42);
    expect(
      sun.explainCoordinates("equatorial", trueEquatorialOfDate).steps
    ).not.toEqual([
      expect.objectContaining({ metadata: { source: "native-table" } }),
    ]);
  });

  it("delegates lambda/beta to the native true-ecliptic pair", () => {
    const moonAlgo: AlgoConfig = {
      name: "moon-native-fixture",
      bodies: ["MOON"],
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
              longitude: 205,
              latitude: 4,
            },
            {
              system: "equatorial",
              reference: trueEquatorialOfDate,
              longitude: 200,
              latitude: -12,
            },
          ],
        }),
      },
    };

    const moon = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(moonAlgo)
      .observe(Moon);

    expect(moon.ecliptic.reference).toEqual(trueEclipticOfDate);
    expect(moon.lambda.decimal).toBe(205);
    expect(moon.beta.decimal).toBe(4);
    expect(moon.ecliptic.l.decimal).toBe(moon.lambda.decimal);
    expect(moon.ecliptic.b.decimal).toBe(moon.beta.decimal);
    expect(moon.ra.decimal).toBe(200);
    expect(moon.dec.decimal).toBe(-12);
  });

  it("derives when only a different system is native", () => {
    const sun = new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(nativeAlgo)
      .observe(Sun);

    // mean equatorial is never published by the fixture, so it is derived.
    expect(
      sun.explainCoordinates("equatorial", meanEquatorialOfDate).steps
    ).not.toEqual([
      expect.objectContaining({ metadata: { source: "native-table" } }),
    ]);
  });
});
