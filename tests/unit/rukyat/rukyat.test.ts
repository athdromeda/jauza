import { describe, it, expect } from "vitest";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { HijriCalendar } from "../../../src/modules/calendar/hijri.js";
import { meanEclipticOfDate } from "../../../src/modules/position.js";
import { brent } from "../../../src/math/numerics.js";
import type { AlgoConfig } from "../../../src/types.js";

const sunStub: AlgoConfig = {
  name: "fixture-sun",
  bodies: ["SUN", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    formula: () => ({ lambda: 0, beta: 0, r: 1 }),
  },
};

const moonStub = (anchorJd: number): AlgoConfig => ({
  name: "fixture-moon",
  bodies: ["MOON"],
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    // longitude crosses zero (the sun stub's longitude) exactly at the anchor,
    // so findConjunction's grid hits the coincident point and converges.
    formula: ({ jd }) => ({ lambda: 0.5 * (jd - anchorJd), beta: 0, r: 1 }),
  },
});

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

    const mockAlgo: AlgoConfig = {
      ...sunStub,
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

    const mockAlgo: AlgoConfig = {
      ...moonStub(2461118.55989),
      name: "mock-custom-conjunction",
      conjunction: () => {
        customConjunctionCalled = true;
        return { jde: 0, ut: 0, moonLon: 0, sunLon: 0 };
      },
    };

    const r = new Rukyat(1447, 10)
      .with({ sun: sunStub, moon: mockAlgo })
      .conjunction();

    expect(customConjunctionCalled).toBe(false);
    expect(r.jde).toBeGreaterThan(0);
  });
});

describe("Rukyat.visibility", () => {
  it("throws if observer is not set", () => {
    const anchor = new HijriCalendar(1447, 10, 1).jd;
    const r = new Rukyat(1447, 10).with({ sun: sunStub, moon: moonStub(anchor) });
    expect(() => r.visibility()).toThrow(
      "call at(observer) before visibility()"
    );
  });
});