import { describe, it, expect } from "vitest";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { meeusMoon } from "../../../src/algos/meeus-moon/index.js";
import { meeusLow } from "../../../src/algos/low-meeus-sun/index.js";
import { Time } from "../../../src/modules/time.js";

describe("Rukyat.conjunction", () => {
  it("computes the conjunction of Shawwal 1447 H", () => {
    const r = new Rukyat(1447, 10)
      .with({ sun: meeusLow, moon: meeusMoon })
      .conjunction();

    const sep = Math.abs(((r.moonLon - r.sunLon + 540) % 360) - 180);
    expect(sep).toBeLessThan(0.05);

    // sanity: Shawwal 1447 AH falls in 2026 Gregorian
    const ut = new Time(r.ut);
    expect(ut.year).toBe(2026);
  });
});