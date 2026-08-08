import { describe, it, expect } from "vitest";
import { getJD, jdToDate } from "./time.js";
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

  it("should return 856 days for date difference between 11 July 2010 and 13 November 2012", () => {
    const date1 = new JulianCalendar(2010, 7, 11);
    const date2 = new JulianCalendar(2012, 11, 13);
    const jd1 = getJD(date1);
    const jd2 = getJD(date2);
    expect(jd2 - jd1).toBe(856);
  });

  it("should return  29 Februari 2016 pukul 10:48:43.2 for JD 2457447.9505", () => {
    const jd = 2457447.9505;
    const date = jdToDate(jd);
    expect(date).toEqual({
      year: 2016,
      month: 2,
      day: 29,
      hour: 10,
      minute: 48,
      second: 43,
      ms: 43200,
    });
  });
});
