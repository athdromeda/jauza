import { describe, expect, it } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import {
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
} from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

// Both the geometric and apparent sources publish a MULTI_SPHERICAL table with
// a native true-equatorial pair that differs from what the graph would derive
// from the primary. The apparent pair must win for apparent accessors without
// disturbing the geometric pair.
const apparentNativeAlgo: AlgoConfig = {
  name: "apparent-native-fixture",
  bodies: ["SUN"],
  SUN: {
    outputType: "MULTI_SPHERICAL",
    origin: "earth",
    distanceUnit: "km",
    formula: () => ({
      r: 150_000_000,
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
          reference: meanEquatorialOfDate,
          longitude: 11,
          latitude: 1,
        },
      ],
    }),
    apparentFormula: () => ({
      r: 150_000_000,
      primary: { system: "ecliptic", reference: trueEclipticOfDate },
      coordinates: [
        {
          system: "ecliptic",
          reference: trueEclipticOfDate,
          longitude: 20,
          latitude: 2,
        },
        {
          system: "equatorial",
          reference: trueEquatorialOfDate,
          longitude: 25,
          latitude: 5,
        },
      ],
    }),
  },
};

describe("Body apparent native coordinates", () => {
  const observe = () =>
    new Earth(0, 0, 0)
      .at(new Time(2025, 8, 17, 5))
      .with(apparentNativeAlgo)
      .observe(Sun);

  it("keeps the geometric native pair for geometric accessors", () => {
    const sun = observe();
    expect(sun.geometric().ra.decimal).toBe(11);
    expect(sun.geometric().dec.decimal).toBe(1);
  });

  it("prefers the apparent native pair for apparent accessors", () => {
    const sun = observe();
    expect(sun.ra.decimal).toBe(25);
    expect(sun.dec.decimal).toBe(5);
    expect(sun.lambda.decimal).toBe(20);
    expect(sun.beta.decimal).toBe(2);
  });

  it("reports apparent-native provenance for apparent reads", () => {
    const sun = observe();
    expect(
      sun.explainCoordinates("equatorial", trueEquatorialOfDate).steps.at(-1)
        ?.metadata
    ).toEqual({ source: "apparent-native-table" });
    expect(
      sun.explainCoordinates("ecliptic", trueEclipticOfDate).steps.at(-1)
        ?.metadata
    ).toEqual({ source: "apparent-native-table" });
  });

  it("keeps geometric-native provenance for geometric reads", () => {
    const sun = observe();
    expect(
      sun.explainCoordinates("equatorial", meanEquatorialOfDate).steps.at(-1)
        ?.metadata
    ).toEqual({ source: "native-table" });
  });
});
