import { describe, it, expect, vi } from "vitest";
import { Earth } from "../../../src/modules/earth.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import {
  eclipticJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEquatorialOfDate,
} from "../../../src/modules/position.js";
import { meanObliquity, trueObliquity } from "../../../src/transformations/obliquity.js";
import { nutationAngles } from "../../../src/transformations/nutation.js";
import { jdInScale } from "../../../src/frames/time-scale.js";
import { normalizeAngle } from "../../../src/math/unit.js";
import { toFrame } from "../../../src/frames/convert.js";
import type { AlgoConfig } from "../../../src/types.js";

const j2000Algo: AlgoConfig = {
  name: "fixture-j2000",
  bodies: ["SUN", "EARTH"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 0, b: 0, r: 0 }),
    distanceUnit: "au",
  },
  EARTH: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 100, b: 0, r: 1 }),
    distanceUnit: "au",
  },
};

const at = (jd: number) =>
  new Earth([0, 0], [0, 0], 0).at(new Time(2000, 1, 1, 12));

describe("Body with a J2000 algo", () => {
  it("observes the sun at J2000 with no precession shift", () => {
    const observer = at(2451545.0).with(j2000Algo);
    const sun = observer.observe(Sun);
    expect(sun.geometric().lambda.decimal).toBeCloseTo(280.0, 4);
  });

  it("uses the of-date mean obliquity for ra/dec", () => {
    const observer = at(2451545.0).with(j2000Algo);
    const sun = observer.observe(Sun);
    expect(Math.abs(sun.geometric().epsilon - meanObliquity(2451545.0))).toBeLessThan(1e-9);
  });

  it("rides the resolver reference for home position and source", () => {
    const observer = at(2451545.0).with(j2000Algo);
    expect(observer.resolver.reference).toEqual(meanEclipticOfDate);
    expect(observer.resolver.system).toBe("ecliptic");
    expect(observer.homePosition.reference).toEqual(meanEclipticOfDate);
    expect(observer.homePosition.system).toBe("ecliptic");
    expect(observer.source.reference).toEqual(meanEclipticOfDate);
    expect(observer.source.system).toBe("ecliptic");
  });

  it("precesses J2000 coords to the of-date frame at later dates", () => {
    const later = new Earth([0, 0], [0, 0], 0)
      .at(new Time(2026, 1, 1, 12))
      .with(j2000Algo);
    const lam = later.observe(Sun).geometric().lambda.decimal;
    expect(lam).toBeGreaterThan(280.2);
    expect(lam).toBeLessThan(280.6);
  });

  it("lets an algo override canonicalization with toCanonical", () => {
    const hook = vi.fn((_pos: ReturnType<typeof toFrame>, _jd: number) =>
      toFrame(
        {
          representation: { kind: "spherical", lon: 100, lat: 0, r: 1 },
          origin: "sun",
          system: "ecliptic",
          reference: eclipticJ2000,
        },
        "ecliptic",
        meanEclipticOfDate,
        2451545.0
      )
    );
    const algo: AlgoConfig = {
      ...j2000Algo,
      EARTH: {
        ...j2000Algo.EARTH!,
        toCanonical: hook,
      },
    };
    const observer = at(2451545.0).with(algo);
    const sun = observer.observe(Sun);
    expect(hook).toHaveBeenCalled();
    expect(sun.geometric().lambda.decimal).toBeCloseTo(280.0, 4);
  });
});

describe("Body graph API", () => {
it("epsilon is model-derived (mean geometric / true apparent) and no longer a mutable 23.5 default", () => {
    const e = new Earth([0, 0], [0, 0], 0).at(new Time(1992, 4, 12, 0)).observe(Sun).with(j2000Algo);
    const graphJd = jdInScale(e.time.jd, e.time.scale, "TT");
    expect(Math.abs(e.geometric().epsilon - meanObliquity(graphJd))).toBeLessThan(1e-9);
    expect(Math.abs(e.epsilon - trueObliquity(graphJd))).toBeLessThan(1e-9);
  });

  it("apparent() adds dpsi to geometric lambda (sun annual aberration excluded here)", () => {
    const e = new Earth([0, 0], [0, 0], 0).at(new Time(1992, 4, 12, 0)).observe(Sun).with(j2000Algo);
    const geo = e.geometric().lambda.decimal;
    const { dpsi } = nutationAngles(e.time.jd);
    const app = e.lambda.decimal;
    expect(app).toBeCloseTo(normalizeAngle(geo + dpsi, 0, 360), 6);
  });

  it("toEquatorial() resolves the stored position to equatorial (apparent true-of-date, geometric mean-of-date)", () => {
    const e = new Earth([0, 0], [0, 0], 0).at(new Time(1992, 4, 12, 0)).observe(Sun).with(j2000Algo).toEquatorial();
    expect(e.position.key.system).toBe("equatorial");
    expect(e.position.key.reference).toEqual(trueEquatorialOfDate);
    expect(e.geometric().position.key.system).toBe("equatorial");
    expect(e.geometric().position.key.reference).toEqual(meanEquatorialOfDate);
    expect(e.ecliptic.system).toBe("ecliptic");
  });
});