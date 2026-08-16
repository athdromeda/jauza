import { describe, it, expect } from "vitest";
import { Earth } from "../../modules/earth.js";
import { Time } from "../../modules/time.js";
import { Sun } from "../../modules/sun.js";
import { meeusLow } from "./index.js";

describe("low-meeus-sun", () => {
  it("should calculate sun position", () => {
    //taken from 24.a Meeus - Astronomical Algorithms
    const observationPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 10, 13, 0);

    const observer = observationPlace.at(observationTime).with(meeusLow);
    const sun = observer.observe(Sun).apparent();

    expect(sun.r).toBeCloseTo(0.99766);
    expect(sun.lambda.decimal).toBeCloseTo(199.90894);
    expect(sun.beta.decimal).toBeCloseTo(0);
    expect(sun.ra.decimal).toBeCloseTo(-161.61918);
    expect(sun.dec.decimal).toBeCloseTo(-7.78507);
  });
});
