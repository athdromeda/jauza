import { describe, it, expect } from "vitest";
import { Rukyat } from "../../../src/modules/rukyat.js";
import { HijriCalendar } from "../../../src/modules/calendar/hijri.js";
import { meanEclipticOfDate } from "../../../src/modules/position.js";
import { brent } from "../../../src/math/numerics.js";
import { Earth } from "../../../src/modules/earth.js";
import { Time } from "../../../src/modules/time.js";
import { DMS, HMS } from "../../../src/modules/angle.js";
import type { AlgoConfig, HilalFn } from "../../../src/types.js";
import type { RukyatData } from "../../../src/utils/conjunction.js";

const sunStub: AlgoConfig = {
  name: "fixture-sun",
  bodies: ["SUN", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    formula: () => ({ lambda: 0, beta: 0, r: 1 }),
    distanceUnit: "au",
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
    distanceUnit: "au",
  },
});

const markerHilalData = (): RukyatData => {
  const t = new Time(2461118.6);
  return {
    sunset: t,
    sunAzimuth: new DMS(270),
    moonAlt: new DMS(4),
    moonAzimuth: new DMS(265),
    moonPosition: new DMS(5),
    elongation: new DMS(6),
    crescentCondition: "Tilted North",
    lag: new HMS(1.25),
    moonset: t,
    moonsetAzimuth: new DMS(263),
    illumination: 0.5,
    age: new HMS(10),
  };
};

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

  it("uses custom conjunction when sun and moon are separate objects sharing the same conjunction", () => {
    let calledWithAnchor: number | undefined;

    const conjunction = (anchorJd: number) => {
      calledWithAnchor = anchorJd;
      return {
        jde: 2461118.55989,
        ut: 2461118.55902,
        moonLon: 358.4633,
        sunLon: 358.4633,
      };
    };

    const sun = { ...sunStub, name: "shared-custom", conjunction };
    const moon = { ...moonStub(2461118.55989), name: "shared-custom", conjunction };

    const r = new Rukyat(1447, 10).with({ sun, moon }).conjunction();

    expect(r).toEqual({
      jde: 2461118.55989,
      ut: 2461118.55902,
      moonLon: 358.4633,
      sunLon: 358.4633,
    });
    expect(calledWithAnchor).toBeDefined();
  });

  it("uses custom hilal when sun and moon share the same hilal implementation", () => {
    let called = false;
    let receivedJde: number | undefined;

    const hilal: HilalFn = (opts) => {
      called = true;
      receivedJde = opts.conjunction.jde;
      return markerHilalData();
    };

    const sun = { ...sunStub, name: "shared-hilal", hilal };
    const moon = { ...moonStub(2461118.55989), name: "shared-hilal", hilal };

    const r = new Rukyat(1447, 10)
      .with({ sun, moon })
      .at(new Earth(-6, 106, 0))
      .conjunction();

    expect(called).toBe(true);
    expect(r.hilal!.lag.decimal).toBe(1.25);
    expect(receivedJde).toBe(r.jde);
  });

  it("does NOT use custom hilal when only the sun defines it", () => {
    let customHilalCalled = false;

    const sun: AlgoConfig = {
      ...sunStub,
      name: "one-sided-hilal",
      hilal: () => {
        customHilalCalled = true;
        return markerHilalData();
      },
    };

    const r = new Rukyat(1447, 10)
      .with({ sun, moon: moonStub(2461118.55989) })
      .at(new Earth(-6, 106, 0))
      .conjunction();

    expect(customHilalCalled).toBe(false);
    expect(r.hilal).toBeDefined();
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