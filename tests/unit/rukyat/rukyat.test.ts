import { describe, it, expect } from "vitest";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { meeusMoon } from "../../../src/algos/meeus-moon/index.js";
import { meeusLow } from "../../../src/algos/low-meeus-sun/index.js";
import { brent } from "../../../src/math/numerics.js";

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
  it("throws if no algo was supplied", () => {
    expect(() => new Rukyat(1445, 1).conjunction()).toThrow();
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

describe("Rukyat.visibility", () => {
  it("throws if observer is not set", () => {
    const r = new Rukyat(1447, 10).with({ sun: meeusLow, moon: meeusMoon });
    expect(() => r.visibility()).toThrow(
      "call at(observer) before visibility()"
    );
  });
});