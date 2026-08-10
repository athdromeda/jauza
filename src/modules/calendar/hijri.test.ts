import { describe, it, expect } from "vitest";
import { HijriCalendar } from "./hijri.js";
import { GregorianCalendar } from "./gregorian.js";

describe("Hijri Convertions", () => {
  it("should convert 17 Ramadan 615 H to JD 2166272.5", () => {
    const date = new HijriCalendar(615, 9, 17);
    const jd = date.jd;
    expect(jd).toBe(2166272.5);
  });

  it("should convert 1 Muharram -1000 H to 14 Mei -349", () => {
    const date = new HijriCalendar(-1000, 1, 1);

    const gregorianDate = new GregorianCalendar(date.jd);
    expect(gregorianDate.info).toMatchObject({
      year: -349,
      month: 5,
      day: 14,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });

  it("should convert 1 Muharram -1000 H to 14 Mei -349", () => {
    const date = new HijriCalendar(-1000, 1, 1);
    expect(date.toGregorian().info).toMatchObject({
      year: -349,
      month: 5,
      day: 14,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });

  const testCases: {
    hijri: { year: number; month: number; day: number };
    gregorian: { year: number; month: number; day: number };
  }[] = [
    {
      // Sabtu 1 Januari 1 M = 16 Jumadil Awwal –640 H
      hijri: { year: -640, month: 5, day: 16 },
      gregorian: { year: 1, month: 1, day: 1 },
    },
    {
      // Rabu 1 Syawal 100 H = 26 April 719 M
      hijri: { year: 100, month: 10, day: 1 },
      gregorian: { year: 719, month: 4, day: 26 },
    },
    {
      // Jumat 15 Oktober 1582 M = 17 Ramadhan 990 H
      hijri: { year: 990, month: 9, day: 17 },
      gregorian: { year: 1582, month: 10, day: 15 },
    },
    {
      // Kamis 30 Dzulhijjah 1502 H = 26 Oktober 2079 M
      hijri: { year: 1502, month: 12, day: 30 },
      gregorian: { year: 2079, month: 10, day: 26 },
    },
  ];

  testCases.forEach((testCase) => {
    const hijriDate = new HijriCalendar(
      testCase.hijri.year,
      testCase.hijri.month,
      testCase.hijri.day
    );
    const gregorianDate = new GregorianCalendar(hijriDate.jd);
    it(`should convert ${testCase.hijri.year} ${testCase.hijri.month} ${testCase.hijri.day} H to ${testCase.gregorian.year} ${testCase.gregorian.month} ${testCase.gregorian.day}`, () => {
      expect(gregorianDate.info).toMatchObject({
        year: testCase.gregorian.year,
        month: testCase.gregorian.month,
        day: testCase.gregorian.day,
        hour: 0,
        minute: 0,
        second: 0,
      });
    });
  });

  testCases.forEach((testCase) => {
    it(`should convert ${testCase.gregorian.year} ${testCase.gregorian.month} ${testCase.gregorian.day} G to ${testCase.hijri.year} ${testCase.hijri.month} ${testCase.hijri.day} H`, () => {
      const gregorianDate = new GregorianCalendar(
        testCase.gregorian.year,
        testCase.gregorian.month,
        testCase.gregorian.day
      );
      const hijriDate = new HijriCalendar(gregorianDate.jd);
      expect(hijriDate.info).toMatchObject({
        year: testCase.hijri.year,
        month: testCase.hijri.month,
        day: testCase.hijri.day,
        hour: 0,
        minute: 0,
        second: 0,
      });
    });
  });
});
