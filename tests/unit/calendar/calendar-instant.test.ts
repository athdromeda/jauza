import { describe, it, expect } from "vitest";
import { GregorianCalendar } from "../../../src/modules/calendar/gregorian.js";
import { JulianCalendar } from "../../../src/modules/calendar/julian.js";
import { HijriCalendar } from "../../../src/modules/calendar/hijri.js";
import { Time } from "../../../src/modules/time.js";
import { CalendarSystem } from "../../../src/types.js";

describe("calendar selection is honored for every construction route", () => {
  const INSTANT = new Date("2024-01-01T00:00:00Z");
  const JAN_1_2024_JD = 2460310.5;

  it("HijriCalendar(Date) preserves the Gregorian instant instead of reinterpreting its fields", () => {
    const hijri = new HijriCalendar(INSTANT);
    const gregorian = new GregorianCalendar(INSTANT);
    expect(hijri.jd).toBe(gregorian.jd);
    expect(hijri.info).toMatchObject({
      year: 1445,
      month: 6,
      day: 19,
      calendar: "HIJRI",
    });
  });

  it("HijriCalendar(Date) agrees with HijriCalendar(jd) for the same instant", () => {
    const fromDate = new HijriCalendar(INSTANT);
    const fromJd = new HijriCalendar(new GregorianCalendar(INSTANT).jd);
    expect(fromDate.jd).toBe(fromJd.jd);
    expect(fromDate.info).toEqual(fromJd.info);
  });

  it("JulianCalendar(Date) preserves the Gregorian instant instead of reinterpreting its fields", () => {
    const julian = new JulianCalendar(INSTANT);
    expect(julian.jd).toBe(JAN_1_2024_JD);
    expect(julian.info).toMatchObject({
      year: 2023,
      month: 12,
      day: 19,
      calendar: "JULIAN",
    });
  });

  it("Time(Date, { calendar: Julian }) treats the Date as a Gregorian instant", () => {
    const t = new Time(INSTANT, { calendar: CalendarSystem.Julian });
    expect(t.jd).toBe(JAN_1_2024_JD);
    expect(t.info).toMatchObject({ year: 2023, month: 12, day: 19 });
  });

  it("Time with calendar HIJRI fails loudly instead of silently lying", () => {
    expect(() =>
      new Time(JAN_1_2024_JD, { calendar: CalendarSystem.Hijri })
    ).toThrow(/HijriCalendar/);
    expect(() =>
      new Time(2024, 1, 1, { calendar: CalendarSystem.Hijri })
    ).toThrow(/HijriCalendar/);
    expect(() =>
      new Time(INSTANT, { calendar: CalendarSystem.Hijri })
    ).toThrow(/HijriCalendar/);
  });

  it("inScale preserves the concrete calendar class", () => {
    const hijri = new HijriCalendar(JAN_1_2024_JD);
    const hijriTt = hijri.inScale("TT");
    expect(hijriTt).toBeInstanceOf(HijriCalendar);
    expect(hijriTt.info.calendar).toBe("HIJRI");
    expect(hijriTt.info).toMatchObject({ year: 1445, month: 6, day: 19 });

    expect(new GregorianCalendar(JAN_1_2024_JD).inScale("TT")).toBeInstanceOf(
      GregorianCalendar
    );
    expect(new JulianCalendar(JAN_1_2024_JD).inScale("TT")).toBeInstanceOf(
      JulianCalendar
    );
  });
});