import { describe, it, expect } from "vitest";
import { normalizeAngle } from "../../math/unit.js";
import { Earth } from "../../modules/earth.js";
import { Moon } from "../../modules/moon.js";
import { eclipticOfDate } from "../../modules/position.js";
import { Time } from "../../modules/time.js";
import { toPosition } from "../../modules/transform.js";
import { meeusLow } from "./index.js";
import type { HeliocentricEcliptic } from "../../types.js";

describe("meeus-moon algo contract", () => {
  it("declares the Moon output as earth-origin ecliptic-of-date", () => {
    const cfg = meeusLow.MOON!;
    const pos = toPosition(cfg.formula({ jd: 2448908.5 }), cfg);
    expect(pos.origin).toBe("earth");
    expect(pos.frame).toEqual(eclipticOfDate);
  });
});

describe("meeus-moon body", () => {
  it("computes the geocentric Moon", () => {
    const observerPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 10, 13, 0);
    const observer = observerPlace.at(observationTime).with(meeusLow);
    const moon = observer.observe(Moon).apparent();

    const raw = meeusLow.MOON!.formula({
      jd: observationTime.jd,
    }) as HeliocentricEcliptic;
    expect(moon.r).toBeCloseTo(raw.r);
    expect(moon.lambda.decimal).toBeCloseTo(normalizeAngle(raw.l));
    expect(
      Math.abs(moon.beta.decimal - normalizeAngle(raw.b)) % 360
    ).toBeCloseTo(0, 2);
  });
});
