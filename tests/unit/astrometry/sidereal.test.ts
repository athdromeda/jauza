import { describe, it, expect } from "vitest";
import { Time } from "../../../src/modules/time.js";
import { nutationAngles } from "../../../src/transformations/nutation.js";
import { trueObliquity } from "../../../src/transformations/obliquity.js";
import { cos } from "../../../src/math/trigonometry.js";

describe("Time sidereal time", () => {
  it("matches Meeus 12.a mean sidereal time for 1987 Apr 10 0h UT", () => {
    const t = new Time(2446895.5);
    const expectedHours = 13 + 10 / 60 + 46.3668 / 3600; // 13h10m46.3668s
    expect(t.gst).toBeCloseTo(expectedHours, 4);
  });

  it("apparent sidereal time adds the equation of the equinoxes", () => {
    const jd = 2451545.0;
    const t = new Time(jd);
    const { dpsi } = nutationAngles(jd);
    const eeHours = (dpsi * cos(trueObliquity(jd))) / 15;
    expect(t.gast - t.gst).toBeCloseTo(eeHours, 10);
    expect(Math.abs(t.gast - t.gst) * 3600).toBeLessThan(1.5);
  });
});