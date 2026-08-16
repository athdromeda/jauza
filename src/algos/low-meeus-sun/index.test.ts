import { describe, it, expect } from "vitest";
import { Earth } from "../../modules/earth.js";
import { Time } from "../../modules/time.js";
import { Sun } from "../../modules/sun.js";
import { meeusLow } from "./index.js";

describe("low-meeus-sun", () => {
  it("should calculate sun position", () => {
    const jakarta = new Earth([-6, 10], [106, 51], 0);
    const observationTime = new Time(2009, 7, 1, 3);

    const observer = jakarta.at(observationTime).with(meeusLow);
    const sun = observer.observe(Sun).apparent();

    expect(sun.r).toBeCloseTo(1.016670259);
    expect(sun.lambda.decimal).toBeCloseTo(99.43032742);
    expect(sun.beta.decimal).toBeCloseTo(0);
    expect(sun.ra.decimal).toBeCloseTo(100.2611833);
    expect(sun.dec.decimal).toBeCloseTo(23.10395198);
    expect(sun.alt).toBeCloseTo(49.13945414115066);
    expect(sun.az).toBeCloseTo(43.20255899);
  });
});
