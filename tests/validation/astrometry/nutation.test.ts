import { describe, it, expect } from "vitest";
import { meanObliquity } from "../../../src/transformations/obliquity.js";
import { nutationAngles, trueObliquity } from "../../../src/transformations/nutation.js";

describe("nutationAngles", () => {
  it("stays near the Meeus 23.a full-series values", () => {
    // Meeus 23.a, JD 2446896.5: dPsi = -3.788", dEps = +9.443"
    // Short series (23.1) agrees to within ~0.5".
    const { dpsi, deps } = nutationAngles(2446896.5);
    expect(Math.abs(dpsi - -3.788 / 3600)).toBeLessThan(1 / 3600);
    expect(Math.abs(deps - 9.443 / 3600)).toBeLessThan(1 / 3600);
  });

  it("stays within physical magnitude bounds at J2000", () => {
    // Nutation does not vanish at J2000: short series gives ~ -14" (dPsi)
    // and ~ -6" (dEps) there.
    const { dpsi, deps } = nutationAngles(2451545.0);
    expect(Math.abs(dpsi)).toBeLessThan(20 / 3600);
    expect(Math.abs(deps)).toBeLessThan(10 / 3600);
  });
});

describe("trueObliquity", () => {
  it("adds the nutation-in-obliquity to the mean obliquity", () => {
    const at = 2446896.5;
    const mean = meanObliquity(at);
    const deps = nutationAngles(at).deps;
    expect(Math.abs(trueObliquity(at) - (mean + deps))).toBeLessThan(1e-12);
  });
});