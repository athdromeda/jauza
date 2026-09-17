import { describe, it, expect } from "vitest";
import { jdInScale } from "../../frames/time-scale.js";
import { normalizeAngle } from "../../math/unit.js";
import { Earth } from "../../modules/earth.js";
import { Moon } from "../../modules/moon.js";
import { meanEclipticOfDate } from "../../modules/position.js";
import { Time } from "../../modules/time.js";
import { toPosition } from "../../modules/transform.js";
import { meeusMoon } from "./index.js";
import type { GeocentricEcliptic } from "../../types.js";

describe("meeus-moon algo contract", () => {
  it("declares the Moon output as earth-origin ecliptic-of-date", () => {
    const cfg = meeusMoon.MOON!;
    const pos = toPosition(cfg.formula({ jd: 2448908.5 }), cfg);
    expect(pos.origin).toBe("earth");
    expect(pos.system).toBe("ecliptic");
    expect(pos.reference).toEqual(meanEclipticOfDate);
  });
});

describe("meeus-moon body", () => {
  it("computes the geocentric Moon", () => {
    const observerPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 10, 13, 0);
    const observer = observerPlace.at(observationTime).with(meeusMoon);
    const moon = observer.observe(Moon);

    const jdTdb = jdInScale(observationTime.jd, "UTC", "TDB");
    const raw = meeusMoon.MOON!.formula({
      jd: jdTdb,
    }) as GeocentricEcliptic;
    expect(moon.r).toBeCloseTo(raw.r, 3);
    expect(moon.lambda.decimal).toBeCloseTo(raw.lambda);
    expect(
      Math.abs(moon.beta.decimal - raw.beta) % 360
    ).toBeCloseTo(0, 2);
  });
});

describe("meeus-moon calculations", () => {
  it("calculates the geocentric Moon", () => {
    const observerPlace = new Earth([0, 0], [0, 0], 0);
    const observationTime = new Time(1992, 4, 12, 0); // was .asDT()
    const observer = observerPlace.at(observationTime).with(meeusMoon);
    const moon = observer.observe(Moon);

    // Task 7: adapter feeds TDB (adapter removed its internal ΔT), apparent() adds nutation dψ.
    // book: Meeus 47.a geometric geocentric λ = 133.162655 (UT). New pipeline:
    // TDB feeding (+0.0088) + nutation dψ (±0.005). Sanity band ±0.2 deg around book value.
    expect(moon.r).toBeCloseTo(368409.0, 1);
    expect(moon.lambda.decimal).toBeGreaterThan(133.0);
    expect(moon.lambda.decimal).toBeLessThan(133.35);
    expect(moon.lambda.decimal).toBeCloseTo(133.17692, 3);
    expect(moon.beta.decimal).toBeCloseTo(-3.230, 3);
  });
});
