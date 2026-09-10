import { describe, it, expect } from "vitest";
import { Time } from "./time.js";
import { HijriCalendar } from "./calendar/hijri.js";

describe("Time", () => {
  describe("jd construction", () => {
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

  describe("timezone", () => {
    it("should convert local civil time with offset to the UT jd", () => {
      const local = new Time(2024, 1, 1, 19, 0, 0, { timezone: 7 });
      const ut = new Time(2024, 1, 1, 12, 0, 0);
      expect(local.jd).toBe(ut.jd);
    });

    it("should display civil fields in the local time zone from a UT jd", () => {
      const t = new Time(2460311, { timezone: 7 });
      expect(t.jd).toBe(2460311);
      expect(t.day).toBe(1);
      expect(t.hour).toBe(19);
    });

    it("should roll the civil day over across the UT boundary", () => {
      const t = new Time(2024, 1, 1, 0, 30, 0, { timezone: 7 });
      expect(t.day).toBe(1);
      expect(t.hour).toBe(0);
      expect(t.minute).toBe(30);
      expect(t.jd).toBeCloseTo(new Time(2023, 12, 31, 17, 30).jd, 6);
    });

    it("should treat a Date-constructed instant and a civil+offset instant identically", () => {
      const fromDate = new Time(new Date("2024-01-01T12:00:00Z"), {
        timezone: 7,
      });
      const fromCivil = new Time(2024, 1, 1, 19, 0, 0, { timezone: 7 });
      expect(fromDate.jd).toBe(fromCivil.jd);
      expect(fromDate.hour).toBe(19);
    });
  });
});

describe("Time.format()", () => {
  // Kamis Wage, 19 Juli 2012 [A. Izzudin, Ilmu Falak Praktis, hal. 97]
  const time = new Time(2012, 7, 19);

  describe("default format (no args)", () => {
    it("should return default format", () => {
      expect(time.format()).toBe("19 July 2012 0:0:0");
    });
  });

  describe("TimeFormatOptions", () => {
    it("should use locale from options", () => {
      const result = time.format({ locale: "id-ID", options: { month: "long" } });
      expect(result).toContain("Juli");
    });
  });

  describe("string pattern", () => {
    it("YYYY", () => {
      expect(time.format("YYYY")).toBe("2012");
    });

    it("YY", () => {
      expect(time.format("YY")).toBe("12");
    });

    it("MMMM", () => {
      expect(time.format("MMMM")).toBe("July");
    });

    it("MMM", () => {
      expect(time.format("MMM")).toBe("Jul");
    });

    it("MM", () => {
      expect(time.format("MM")).toBe("07");
    });

    it("M", () => {
      expect(time.format("M")).toBe("7");
    });

    it("DD", () => {
      expect(time.format("DD")).toBe("19");
    });

    it("D", () => {
      expect(time.format("D")).toBe("19");
    });

    it("dddd", () => {
      expect(time.format("dddd")).toBe("Thursday");
    });

    it("ddd", () => {
      expect(time.format("ddd")).toBe("Thu");
    });

    it("HH", () => {
      expect(time.format("HH")).toBe("00");
    });

    it("H", () => {
      expect(time.format("H")).toBe("0");
    });

    it("hh", () => {
      expect(time.format("hh")).toBe("12");
    });

    it("h", () => {
      expect(time.format("h")).toBe("12");
    });

    it("mm", () => {
      expect(time.format("mm")).toBe("00");
    });

    it("m", () => {
      expect(time.format("m")).toBe("0");
    });

    it("ss", () => {
      expect(time.format("ss")).toBe("00");
    });

    it("s", () => {
      expect(time.format("s")).toBe("0");
    });

    it("A", () => {
      expect(time.format("A")).toBe("AM");
    });

    it("a", () => {
      expect(time.format("a")).toBe("am");
    });

    it("combined pattern", () => {
      expect(time.format("YYYY-MM-DD")).toBe("2012-07-19");
    });

    it("full pattern with time", () => {
      expect(time.format("dddd, D MMMM YYYY")).toBe(
        "Thursday, 19 July 2012"
      );
    });

    it("pasaran lowercase (p and ppp)", () => {
      const result = time.format("ppp");
      expect(result).toBe("wage");
      expect(time.format("p")).toBe(time.format("ppp"));
    });

    it("pasaran capitalized (PPP and P)", () => {
      const result = time.format("PPP");
      expect(result).toBe("Wage");
      expect(time.format("P")).toBe(time.format("PPP"));
    });

    it("pattern with pasaran", () => {
      expect(time.format("YYYY-MM-DD (PPP)")).toBe("2012-07-19 (Wage)");
    });
  });

  describe("string pattern with locale", () => {
    it("should use locale for named tokens", () => {
      const result = time.format("dddd, D MMMM YYYY", { locale: "id-ID" });
      expect(result).toBe("Kamis, 19 Juli 2012");
    });

    it("should use locale for month names", () => {
      const result = time.format("MMMM YYYY", { locale: "de-DE" });
      expect(result).toBe("Juli 2012");
    });
  });

  describe("Hijri calendar", () => {
    it("should format Hijri dates with default month names", () => {
      const hijri = new HijriCalendar(1446, 3, 15);
      const result = hijri.format("D MMMM YYYY");
      expect(result).toBe("15 Rabi'ul Awwal 1446");
    });

    it("should format Hijri dates with pasaran", () => {
      const hijri = new HijriCalendar(1446, 3, 15);
      const result = hijri.format("D MMMM YYYY PPP");
      expect(result).toMatch(
        /^\d+ [\w\s']+ \d+ (Kliwon|Legi|Pahing|Pon|Wage)$/
      );
    });

    it("should use custom hijriMonths when provided", () => {
      const hijri = new HijriCalendar(1446, 9, 1);
      const customMonths = [
        "Muharram", "Safar", "Rabi I", "Rabi II",
        "Jumada I", "Jumada II", "Rajab", "Sha'ban",
        "Ramadan", "Shawwal", "Dhul Qa'dah", "Dhul Hijjah",
      ];
      const result = hijri.format("D MMMM YYYY", { hijriMonths: customMonths });
      expect(result).toBe("1 Ramadan 1446");
    });

    it("should format default options with Hijri month names", () => {
      const hijri = new HijriCalendar(1446, 10, 1);
      const result = hijri.format();
      expect(result).toContain("Syawwal");
    });
  });
});
