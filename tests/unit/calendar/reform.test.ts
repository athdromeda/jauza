import { describe, it, expect } from "vitest";
import { Time } from "../../../src/modules/time.js";
import { JulianCalendar } from "../../../src/modules/calendar/julian.js";
import { CalendarMode } from "../../../src/types.js";

// Hybrid: Julian before 1582-10-15, Gregorian after. The 1582 reform skipped
// 1582-10-05..14, so those civil dates must not exist in hybrid mode.
const GHOST_DAYS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

describe("Gregorian reform gap (CalendarMode.Hybrid, default)", () => {
  it("defaults to hybrid mode", () => {
    expect(new Time(2000, 1, 1).mode).toBe(CalendarMode.Hybrid);
  });

  it("rejects the non-existent dates 1582-10-05..14", () => {
    for (const day of GHOST_DAYS) {
      expect(() => new Time(1582, 10, day)).toThrow(
        /does not exist in the hybrid calendar \(Gregorian reform gap 1582-10-05\.\.14\)/
      );
    }
  });

  it("accepts the boundaries either side of the gap", () => {
    expect(new Time(1582, 10, 4).jd).toBe(2299159.5); // Julian
    expect(new Time(1582, 10, 15).jd).toBe(2299160.5); // Gregorian
  });

  it("keeps the historical hybrid JD -> date mapping (Meeus convention)", () => {
    expect(new Time(2299159.5).info).toMatchObject({
      year: 1582,
      month: 10,
      day: 4,
    });
    expect(new Time(2299160.5).info).toMatchObject({
      year: 1582,
      month: 10,
      day: 15,
    });
  });
});

describe("CalendarMode.ProlepticGregorian", () => {
  it("accepts the 1582-10-05..14 dates with proleptic JDs", () => {
    expect(
      new Time(1582, 10, 5, { mode: CalendarMode.ProlepticGregorian }).jd
    ).toBe(2299150.5);
    expect(
      new Time(1582, 10, 14, { mode: CalendarMode.ProlepticGregorian }).jd
    ).toBe(2299159.5);
  });

  it("round-trips a proleptic JD back to the same civil date", () => {
    const t = new Time(2299150.5, { mode: CalendarMode.ProlepticGregorian });
    expect(t.info).toMatchObject({ year: 1582, month: 10, day: 5 });
    expect(t.mode).toBe(CalendarMode.ProlepticGregorian);
  });

  it("applies the Gregorian leap/B term uniformly before 1582", () => {
    // Same civil date, different JD: hybrid (Julian rules) vs proleptic
    // (Gregorian rules) for a pre-reform year.
    expect(new Time(1500, 3, 1).jd).toBe(2268992.5); // hybrid → Julian
    expect(
      new Time(1500, 3, 1, { mode: CalendarMode.ProlepticGregorian }).jd
    ).toBe(2268982.5); // proleptic → Gregorian
  });
});

describe("CalendarMode interaction with other calendars", () => {
  it("JulianCalendar accepts the ghost dates (the Julian calendar has no gap)", () => {
    expect(new JulianCalendar(1582, 10, 5).jd).toBe(2299160.5);
    expect(new JulianCalendar(1582, 10, 14).jd).toBe(2299169.5);
  });

  it("does not throw on a Date input regardless of mode (Date is proleptic)", () => {
    expect(new Time(new Date("1582-10-05T00:00:00Z")).jd).toBe(2299150.5);
    expect(
      new Time(new Date("1582-10-05T00:00:00Z"), {
        mode: CalendarMode.Hybrid,
      }).jd
    ).toBe(2299150.5);
  });

  it("preserves mode through inScale", () => {
    const t = new Time(2000, 1, 1, {
      mode: CalendarMode.ProlepticGregorian,
    });
    expect(t.inScale("TT").mode).toBe(CalendarMode.ProlepticGregorian);
  });
});
