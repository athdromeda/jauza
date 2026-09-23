import { describe, it, expect } from "vitest";
import { Time } from "../../../src/modules/time.js";

describe("Time jd construction (known-date references)", () => {
  it("should return 2431684.5 for 17 Agustus 1945", () => {
    const date = new Time(1945, 8, 17);
    expect(date.jd).toBe(2431684.5);
  });

  it("should return 856 days for date difference between 11 July 2010 and 13 November 2012", () => {
    const date1 = new Time(2010, 7, 11);
    const date2 = new Time(2012, 11, 13);
    expect(date2.jd - date1.jd).toBe(856);
  });

  it("should format 19 Juli 2012 as Kamis Wage", () => {
    const date = new Time(2012, 7, 19);
    expect(date.format("dddd (PPP)")).toBe("Thursday (Wage)");
  });
});