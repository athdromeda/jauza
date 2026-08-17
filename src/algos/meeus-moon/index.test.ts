import { describe, it, expect } from "vitest";
import { normalizeAngle } from "../../math/unit.js";
import { Earth } from "../../modules/earth.js";
import { Moon } from "../../modules/moon.js";
import { eclipticOfDate } from "../../modules/position.js";
import { Time } from "../../modules/time.js";
import { toPosition } from "../../modules/transform.js";
import { meeusMoon } from "./index.js";
import type { HeliocentricEcliptic } from "../../types.js";

describe("meeus-moon algo contract", () => {
  it("declares the Moon output as earth-origin ecliptic-of-date", () => {
    const cfg = meeusMoon.MOON!;
    const pos = toPosition(cfg.formula({ jd: 2448908.5 }), cfg);
    expect(pos.origin).toBe("earth");
    expect(pos.frame).toEqual(eclipticOfDate);
  });
});

describe("meeus-moon body", () => {
  it("computes the geocentric Moon", () => {
    const observerPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 10, 13, 0);
    const observer = observerPlace.at(observationTime).with(meeusMoon);
    const moon = observer.observe(Moon).apparent();

    const raw = meeusMoon.MOON!.formula({
      jd: observationTime.jd,
    }) as HeliocentricEcliptic;
    expect(moon.r).toBeCloseTo(raw.r);
    expect(moon.lambda.decimal).toBeCloseTo(normalizeAngle(raw.l));
    expect(
      Math.abs(moon.beta.decimal - normalizeAngle(raw.b)) % 360
    ).toBeCloseTo(0, 2);
  });
});

describe("meeus-moon calculations", () => {
  it("calculates the geocentric Moon", () => {
    const observerPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 4, 12, 0).asDT();
    const observer = observerPlace.at(observationTime).with(meeusMoon);
    const moon = observer.observe(Moon).apparent();

    expect(moon.r).toBeCloseTo(368409.7, 1);
    expect(moon.lambda.decimal).toBeCloseTo(133.162655);
    expect(moon.beta.decimal).toBeCloseTo(-3.229126); // TODO: investigate slight difference on corrected_sum_b (calculated: -3229350.4470794955, meeus: -3229126.0)
  });
});
