import { describe, it, expect } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Moon } from "../../../src/modules/moon.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import { eclipticJ2000 } from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

const fixture: AlgoConfig = {
  name: "fixture-observe",
  bodies: ["SUN", "MOON", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 0, b: 0, r: 0 }),
    distanceUnit: "au",
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 180, b: 5, r: 0.00257 }),
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

describe("observe() shares and re-targets the observer (documented)", () => {
  it("returns the shared observer instance", () => {
    const observer = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(fixture);
    const sun = observer.observe(Sun);
    const moon = observer.observe(Moon);
    expect(sun).toBe(observer);
    expect(moon).toBe(observer);
  });

  it("re-targets earlier handles when a second body is observed", () => {
    const observer = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2000, 1, 1, 12))
      .with(fixture);
    const sun = observer.observe(Sun);
    const sunLambda = sun.geometric().lambda.decimal;

    observer.observe(Moon);

    // The `sun` handle aliases the shared observer, so it now reads Moon.
    expect(sun.geometric().lambda.decimal).not.toBeCloseTo(sunLambda, 6);
  });
});