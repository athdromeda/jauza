import { describe, it, expect } from "vitest";
import { JulianCalendar } from "./julian.js";

describe("JulianCalendar", () => {
  it("should return 1949029.5 for 26 Februari 624 M", () => {
    const date = new JulianCalendar(624, 2, 26);
    expect(date.jd).toBe(1949029.5);
  });

  it("should return 639553.32435 for 1 Januari 2962 SM pukul 19:47:04 TD", () => {
    const date = new JulianCalendar(-2961, 1, 1, 19, 47, 4);
    expect(date.jd).toBeCloseTo(639553.32435, 5);
  });

  it("should return 856 days for date difference between 11 July 2010 and 13 November 2012", () => {
    const date1 = new JulianCalendar(2010, 7, 11);
    const date2 = new JulianCalendar(2012, 11, 13);
    expect(date2.jd - date1.jd).toBe(856);
  });
});
