import { describe, it, expect } from "vitest";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { meeusMoon } from "../../../src/algos/meeus-moon/index.js";
import { meeusLow } from "../../../src/algos/low-meeus-sun/index.js";

describe("Rukyat.conjunction", () => {
  it("returns the ijtimak with coincident moon/sun longitude", () => {
    const r = new Rukyat(1445, 1)
      .with({ sun: meeusLow, moon: meeusMoon })
      .conjunction();

    const sep = Math.abs(((r.moonLon - r.sunLon + 540) % 360) - 180);
    expect(sep).toBeLessThan(0.05);
    expect(Number.isFinite(r.jde)).toBe(true);
    expect(Number.isFinite(r.ut)).toBe(true);
    expect(r.hilal).toBeUndefined();
  });
});