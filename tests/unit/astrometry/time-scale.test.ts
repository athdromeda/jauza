import { describe, it, expect } from "vitest";
import {
  jdInScale,
  scaleShift,
  taiMinusUtc,
  ttMinusUtcDays,
  UnsupportedTimeScaleError,
  UTCPreEpochError,
} from "../../../src/frames/time-scale.js";
import { Time } from "../../../src/modules/time.js";
import {
  UTC_OFFSET_ROWS,
  UTC_START_JD,
} from "../../../src/data/utc-offset.js";

describe("time scales", () => {
  it("jdInScale is identity on the same scale", () => {
    expect(jdInScale(2451545.0, "UTC", "UTC")).toBe(2451545.0);
  });

  it("jdInScale uses the exact TT−UTC offset (26 leap seconds + 32.184 s in 1992)", () => {
    const jd = 2448688.5; // 1992-03-07, TAI−UTC = 26
    const tt = jdInScale(jd, "UTC", "TT");
    expect((tt - jd) * 86400).toBeCloseTo(26 + 32.184, 4);
  });

  it("TDB differs from TT only by the ~1.7ms periodic term", () => {
    const tdb = jdInScale(2451545.0, "TT", "TDB");
    const d = Math.abs(tdb - 2451545.0) * 86400;
    expect(d).toBeLessThan(0.0016 * 1.2);
  });

  it("UTC<->TT round trips", () => {
    const jd = 2462088.69;
    expect(jdInScale(jdInScale(jd, "UTC", "TT"), "TT", "UTC")).toBeCloseTo(jd, 9);
  });

  it("rejects unknown scales", () => {
    expect(() => scaleShift("UTC" as never, "GPS" as never, 2451545.0)).toThrow(
      UnsupportedTimeScaleError
    );
  });

  describe("UTC_OFFSET_ROWS (ERFA dat.c table)", () => {
    it("starts at 1960-01-01 and ends at the 2017-01-01 leap second", () => {
      expect(UTC_START_JD).toBe(2436934.5);
      expect(UTC_OFFSET_ROWS.length).toBe(42);
      expect(UTC_OFFSET_ROWS[0]).toEqual({
        year: 1960,
        month: 1,
        delat: 1.4178180,
        driftMjd: 37300.0,
        rate: 0.0012960,
      });
      expect(UTC_OFFSET_ROWS[41]).toEqual({
        year: 2017,
        month: 1,
        delat: 37.0,
        driftMjd: 0,
        rate: 0,
      });
    });

    it("is sorted by (year, month) and drift anchors match ERFA", () => {
      for (let i = 1; i < UTC_OFFSET_ROWS.length; i++) {
        const a = UTC_OFFSET_ROWS[i - 1]!;
        const b = UTC_OFFSET_ROWS[i]!;
        const aKey = a.year * 12 + a.month;
        const bKey = b.year * 12 + b.month;
        expect(bKey).toBeGreaterThan(aKey);
      }
      // The 14 pre-1972 drift anchors/rates, verbatim from ERFA `dat.c`.
      const anchors = UTC_OFFSET_ROWS.slice(0, 14).map((r) => [r.driftMjd, r.rate]);
      expect(anchors).toEqual([
        [37300.0, 0.0012960],
        [37300.0, 0.0012960],
        [37300.0, 0.0012960],
        [37665.0, 0.0011232],
        [37665.0, 0.0011232],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [38761.0, 0.0012960],
        [39126.0, 0.0025920],
        [39126.0, 0.0025920],
      ]);
      // 1972+ rows carry no drift.
      for (const r of UTC_OFFSET_ROWS.slice(14)) {
        expect(r.driftMjd).toBe(0);
        expect(r.rate).toBe(0);
      }
    });
  });

  it("Time.inScale shifts jd and asDT() is TT (scaled)", () => {
    const t = new Time(1992, 4, 12, 0); // UTC
    const tt = t.inScale("TT");
    expect(tt.jd).toBeGreaterThan(t.jd);
    expect(tt.scale).toBe("TT");
    expect(t.scale).toBe("UTC");
    expect(t.asDT().jd).toBeCloseTo(tt.jd, 9);
    expect(t.asDT().scale).toBe("TT");
  });
});

describe("taiMinusUtc (ERFA/SOFA era model)", () => {
  it("rejects dates before 1960-01-01", () => {
    expect(() => taiMinusUtc(new Time(1959, 12, 31).jd)).toThrow(UTCPreEpochError);
    expect(() => taiMinusUtc(new Time(1800, 1, 1).jd)).toThrow(UTCPreEpochError);
  });

  it("re-derives the ERFA drift value at 1960-01-01 (first row, negative drift)", () => {
    const jd = new Time(1960, 1, 1).jd;
    const mjd = jd - 2400000.5;
    const expected = 1.4178180 + (mjd - 37300.0) * 0.0012960;
    expect(taiMinusUtc(jd)).toBeCloseTo(expected, 9);
  });

  it("matches the ERFA drift expression at each pre-1972 change row", () => {
    // Independent re-derivation from the ERFA constants, one row per era:
    // delat[i] + rate[i] * (mjd - driftMjd[i]).
    const rows = [
      { year: 1961, month: 1, delat: 1.4228180, driftMjd: 37300.0, rate: 0.0012960 },
      { year: 1962, month: 1, delat: 1.8458580, driftMjd: 37665.0, rate: 0.0011232 },
      { year: 1965, month: 1, delat: 3.5401300, driftMjd: 38761.0, rate: 0.0012960 },
      { year: 1966, month: 1, delat: 4.3131700, driftMjd: 39126.0, rate: 0.0025920 },
    ];
    for (const r of rows) {
      const jd = new Time(r.year, r.month, 1).jd;
      const mjd = jd - 2400000.5;
      const expected = r.delat + (mjd - r.driftMjd) * r.rate;
      expect(taiMinusUtc(jd)).toBeCloseTo(expected, 9);
    }
  });

  it("is continuous in the drift era and stays just under 10 s before 1972", () => {
    const jd = new Time(1971, 12, 31).jd + 23 / 24 + 59 / 1440 + 59 / 86400;
    const mjd = jd - 2400000.5;
    const expected = 4.2131700 + (mjd - 39126.0) * 0.0025920;
    expect(taiMinusUtc(jd)).toBeCloseTo(expected, 9);
    expect(taiMinusUtc(jd)).toBeGreaterThan(9);
    expect(taiMinusUtc(jd)).toBeLessThan(10);
  });

  it("uses the integer leap-second series from 1972-01-01", () => {
    expect(taiMinusUtc(new Time(1972, 1, 1).jd)).toBe(10);
    expect(taiMinusUtc(new Time(1992, 7, 1).jd)).toBe(27);
    expect(taiMinusUtc(new Time(2015, 7, 1).jd)).toBe(36);
    expect(taiMinusUtc(new Time(2017, 1, 1).jd)).toBe(37);
    expect(taiMinusUtc(new Time(2025, 1, 1).jd)).toBe(37);
  });

  it("uses the pre-leap value for a day that ends in a leap second", () => {
    expect(taiMinusUtc(new Time(2016, 12, 31).jd)).toBe(36);
  });
});

describe("ttMinusUtcDays", () => {
  it("is exactly (TAI-UTC) + 32.184 s", () => {
    expect(ttMinusUtcDays(new Time(2025, 1, 1).jd) * 86400).toBeCloseTo(37 + 32.184, 9);
    expect(ttMinusUtcDays(new Time(1972, 1, 1).jd) * 86400).toBeCloseTo(10 + 32.184, 9);
  });

  it("propagates through Time.inScale and throws pre-1960", () => {
    const tt = new Time(2025, 1, 1).inScale("TT");
    // Precision 4: subtracting two ~2.4e6 JDs to recover an ~8e-4-day offset
    // suffers catastrophic cancellation (~1.4e-5 s of noise).
    expect((tt.jd - new Time(2025, 1, 1).jd) * 86400).toBeCloseTo(69.184, 4);
    expect(() => new Time(1800, 1, 1).inScale("TT")).toThrow(UTCPreEpochError);
  });
});