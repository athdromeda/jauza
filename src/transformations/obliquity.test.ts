import { describe, it, expect } from "vitest";
import { J2000_OBLIQUITY, julianCenturies, meanObliquity } from "./obliquity.js";

describe("meanObliquity", () => {
  it("returns the J2000 mean obliquity at T = 0", () => {
    // Meeus 22.2 check: J2000 -> 23°26'21.448" = 23.439291111... deg
    expect(Math.abs(meanObliquity(2451545.0) - J2000_OBLIQUITY)).toBeLessThan(1e-9);
  });

  it("matches Meeus example 22.a", () => {
    // JD 2446895.5 -> mean obliquity 23°26'27.407"
    const expected = 23 + 26 / 60 + 27.407 / 3600; // 23.440946389...
    expect(Math.abs(meanObliquity(2446895.5) - expected)).toBeLessThan(1e-6);
  });

  it("computes Julian centuries from JD", () => {
    expect(Math.abs(julianCenturies(2451545.0))).toBeLessThan(1e-12);
    expect(Math.abs(julianCenturies(2461041.5) - 0.26)).toBeLessThan(1e-12);
  });
});