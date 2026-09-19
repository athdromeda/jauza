import { describe, it, expect } from "vitest";
import { Rukyat } from "./rukyat.js";
import { meeusMoon } from "../algos/meeus-moon/index.js";
import { meeusLow } from "../algos/low-meeus-sun/index.js";
import { brent } from "../math/numerics.js";
import { Time } from "./time.js";

describe("numerics.brent", () => {
  it("finds sqrt(2)", () => {
    const root = brent((x) => x * x - 2, 1, 2, 1e-10);
    expect(Math.abs(root - Math.SQRT2)).toBeLessThan(1e-9);
  });

  it("throws when the root is not bracketed", () => {
    expect(() => brent((x) => x * x - 2, 1, 1.4)).toThrow();
  });
});

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

  it("throws if no algo was supplied", () => {
    expect(() => new Rukyat(1445, 1).conjunction()).toThrow();
  });

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

  it("uses algorithm custom conjunction function when sun and moon algorithms are the same", () => {
    const expectedResult = {
      jde: 2461118.55989,
      ut: 2461118.55902,
      moonLon: 358.4633,
      sunLon: 358.4633,
    };

    let calledWithAnchor: number | undefined;

    const mockAlgo = {
      ...meeusMoon,
      name: "mock-custom-conjunction",
      conjunction: (anchorJd: number) => {
        calledWithAnchor = anchorJd;
        return expectedResult;
      },
    };

    const r = new Rukyat(1447, 10).with(mockAlgo).conjunction();
    expect(r).toEqual(expectedResult);
    expect(calledWithAnchor).toBeDefined();
  });

  it("does NOT use custom conjunction function when sun and moon algorithms are different", () => {
    let customConjunctionCalled = false;

    const mockAlgo = {
      ...meeusMoon,
      name: "mock-custom-conjunction",
      conjunction: () => {
        customConjunctionCalled = true;
        return { jde: 0, ut: 0, moonLon: 0, sunLon: 0 };
      },
    };

    const r = new Rukyat(1447, 10)
      .with({ sun: meeusLow, moon: mockAlgo })
      .conjunction();

    expect(customConjunctionCalled).toBe(false);
    expect(r.jde).toBeGreaterThan(0);
  });
});
