import { describe, it, expect } from "vitest";
import { getJD } from "./time.js";
import { JulianCalendar } from "../modules/calendar/julian.js";

describe("getJD", () => {
  it("should return 2431684.5 for 17 Agustus 1945", () => {
    const date = new Date("1945-08-17T00:00:00Z");
    const jd = getJD(date);
    expect(jd).toBe(2431684.5);
  });

  it("should return 1949029.5 for 26 Februari 624 M", () => {
    const date = new JulianCalendar(624, 2, 26);
    const jd = getJD(date);
    expect(jd).toBe(1949029.5);
  });

  it("should return  639553.32435 for 1 Januari 2962 SM pukul 19:47:04 TD", () => {
    const date = new JulianCalendar(-2961, 1, 1, 19, 47, 4);
    const jd = getJD(date);
    expect(jd).toBeCloseTo(639553.32435, 5);
  });
});
