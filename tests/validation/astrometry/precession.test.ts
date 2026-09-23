import { describe, it, expect } from "vitest";
import { asin, atan2, cos, sin } from "../../../src/math/trigonometry.js";
import { Vec3 } from "../../../src/modules/vec3.js";
import {
  precessEquatorialDateToJ2000,
  precessEquatorialJ2000ToDate,
} from "../../../src/transformations/precession.js";

describe("precessEquatorialJ2000ToDate", () => {
  it("matches Meeus 21.b for theta Persei (to 2028)", () => {
    // J2000 a = 2h44m11.986s, d = +49°13'42.48" (pure precession, no PM)
    const a0 = (2 + 44 / 60 + 11.986 / 3600) * 15; // 41.049941667
    const d0 = 49 + 13 / 60 + 42.48 / 3600; // 49.228466667
    const x0 = cos(d0) * cos(a0);
    const y0 = cos(d0) * sin(a0);
    const z0 = sin(d0);

    // JD 2462088.69 (13.19 Nov 2028):
    // a' = 41.543086, d' = 49.349207
    const p = precessEquatorialJ2000ToDate(new Vec3(x0, y0, z0), 2462088.69);
    expect(atan2(p.y, p.x)).toBeCloseTo(41.543086, 5);
    expect(asin(p.z)).toBeCloseTo(49.349207, 5);
  });

  it("is the identity at J2000", () => {
    const p = precessEquatorialJ2000ToDate(new Vec3(0.5, 0.25, 0.1), 2451545.0);
    expect(Math.abs(p.x - 0.5)).toBeLessThan(1e-12);
    expect(Math.abs(p.y - 0.25)).toBeLessThan(1e-12);
    expect(Math.abs(p.z - 0.1)).toBeLessThan(1e-12);
  });
});

describe("precessEquatorialDateToJ2000", () => {
  it("inverts precessEquatorialJ2000ToDate", () => {
    const p = precessEquatorialJ2000ToDate(new Vec3(0.4, -0.3, 0.9), 2461041.5);
    const p2 = precessEquatorialDateToJ2000(p, 2461041.5);
    expect(Math.abs(p2.x - 0.4)).toBeLessThan(1e-9);
    expect(Math.abs(p2.y - -0.3)).toBeLessThan(1e-9);
    expect(Math.abs(p2.z - 0.9)).toBeLessThan(1e-9);
  });
});
