import { describe, it, expect } from "vitest";
import { GregorianCalendar } from "./gregorian.js";

describe("GregorianCalendar", () => {
  it("should return 2457447.9505 for 29 Februari 2016 pukul 10:48:43", () => {
    const date = new GregorianCalendar(2016, 2, 29, 10, 48, 43);
    expect(date.jd).toBeCloseTo(2457447.9505, 4);
  });

  it("should convert JD 2457447.9505 to 29 Februari 2016 10:48:43", () => {
    const date = new GregorianCalendar(2457447.9505).info;
    expect(date).toMatchObject({
      year: 2016,
      month: 2,
      day: 29,
      hour: 10,
      minute: 48,
      second: 43,
    });
  });
});
