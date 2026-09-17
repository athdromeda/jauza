import { describe, it, expect } from "vitest";
import { jdInScale, scaleShift, UnsupportedTimeScaleError } from "./time-scale.js";
import { Time } from "../modules/time.js";

describe("time scales", () => {
  it("jdInScale is identity on the same scale", () => {
    expect(jdInScale(2451545.0, "UTC", "UTC")).toBe(2451545.0);
  });

  it("jdInScale preserves UTC time steps for negative deltaT", () => {
    // 1992: deltaT ~ +60s -> TT = UTC + 0.00069d
    const tt = jdInScale(2448688.5, "UTC", "TT");
    expect(tt - 2448688.5).toBeGreaterThan(0.0005);
    expect(tt - 2448688.5).toBeLessThan(0.001);
  });

  it("TDB differs from TT only by the ~1.7ms periodic term", () => {
    const tdb = jdInScale(2451545.0, "TT", "TDB");
    const d = Math.abs(tdb - 2451545.0) * 86400;
    expect(d).toBeLessThan(0.0016 * 1.2);
  });

  it("UTC<->TT round trips", () => {
    const jd = 2462088.69;
    expect(jdInScale(jdInScale(jd, "UTC", "TT"), "TT", "UTC")).toBeCloseTo(jd, 9);
  });

  it("rejects unknown scales", () => {
    expect(() => scaleShift("UTC" as never, "GPS" as never, 2451545.0)).toThrow(
      UnsupportedTimeScaleError
    );
  });

  it("Time.inScale shifts jd and asDT() is TT (scaled)", () => {
    const t = new Time(1992, 4, 12, 0); // UTC
    const tt = t.inScale("TT");
    expect(tt.jd).toBeGreaterThan(t.jd);
    expect(tt.scale).toBe("TT");
    expect(t.scale).toBe("UTC");
    expect(t.asDT().jd).toBeCloseTo(tt.jd, 9);
    expect(t.asDT().scale).toBe("TT");
  });
});