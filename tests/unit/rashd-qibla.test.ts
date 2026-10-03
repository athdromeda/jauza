import { describe, it, expect } from "vitest";
import { Earth, RashdQibla, Sun, Time } from "../../src/index.js";
import { meanEclipticOfDate } from "../../src/modules/position.js";
import { sin } from "../../src/math/trigonometry.js";
import { normalizeAngle } from "../../src/math/unit.js";
import { getQibla } from "../../src/utils/qibla.js";
import type { AlgoConfig } from "../../src/types.js";

const KAABA_LAT = 21.42250833;
const KAABA_LNG = 39.82616111;

const lowPrecSun: AlgoConfig = {
  name: "meeus-low-precision-sun",
  bodies: ["EARTH"],
  EARTH: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    formula: ({ jd }) => {
      const T = (jd - 2451545) / 36525;
      const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
      const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
      const C =
        (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
        (0.019993 - 0.000101 * T) * sin(2 * M) +
        0.000289 * sin(3 * M);
      const trueLong = L0 + C;
      const omega = 125.04 - 1934.136 * T;
      const lambda = trueLong - 0.00569 - 0.00478 * sin(omega);
      return { l: lambda + 180, b: 0, r: 1 };
    },
    distanceUnit: "au",
  },
};

function sunDec(jd: number): number {
  return new Earth(0, 0, 0)
    .at(new Time(jd))
    .observe(Sun)
    .with(lowPrecSun)
    .dec.decimal;
}

function subSolarLng(jd: number): number {
  const raHours =
    new Earth(0, 0, 0).at(new Time(jd)).observe(Sun).with(lowPrecSun).ra
      .decimal / 15;
  const gstHours = new Time(jd).gst;
  return normalizeAngle(15 * (raHours - gstHours), 0, 360);
}

describe("RashdQibla (global)", () => {
  it("returns the two annual moments when the sun is over the Kaaba", () => {
    const times = RashdQibla(2025).with(lowPrecSun);

    expect(times).toHaveLength(2);
    const months = times.map((t) => t.month).sort((a, b) => a - b);
    expect(months).toEqual([5, 7]);
    for (const t of times) {
      expect(t).toBeInstanceOf(Time);
      expect(t.year).toBe(2025);
      expect(Math.abs(sunDec(t.jd) - KAABA_LAT)).toBeLessThan(0.1);
      expect(Math.abs(subSolarLng(t.jd) - KAABA_LNG)).toBeLessThan(0.05);
    }
  });

  it("defaults to the current year when called without arguments", () => {
    const currentYear = new Time(new Date()).year;
    const times = RashdQibla().with(lowPrecSun);

    expect(times).toHaveLength(2);
    for (const t of times) {
      expect(t.year).toBe(currentYear);
    }
  });

  it("supports `new` and returns Time[] from with()", () => {
    const times = new RashdQibla(2025).with(lowPrecSun);
    expect(Array.isArray(times)).toBe(true);
    expect(times[0]).toBeInstanceOf(Time);
  });
});

describe("RashdQibla (local)", () => {
  const jakarta = new Earth(-6.169777778, 106.8307333);

  it("returns moments the shadow points to the Kaaba", () => {
    const date = new Time(2025, 6, 1);
    const times = RashdQibla(date).with(lowPrecSun).at(jakarta);

    const qibla = getQibla(jakarta.lat, jakarta.lng);
    const targetAz = normalizeAngle(qibla + 180, 0, 360);

    for (const t of times) {
      const az = new Earth(jakarta.lat, jakarta.lng, jakarta.h)
        .at(new Time(t.jd))
        .observe(Sun)
        .with(lowPrecSun)
        .az;
      expect(Math.abs(normalizeAngle(az - targetAz, -180, 180))).toBeLessThan(
        0.1
      );
    }
  });

  it("returns times in the observer's timezone", () => {
    const date = new Time(2025, 6, 1);
    const times = RashdQibla(date).with(lowPrecSun).at(jakarta);
    const tz = Math.round(jakarta.lng / 15);
    for (const t of times) {
      expect(t.timezone).toBe(tz);
    }
  });

  it("throws when constructed with a year but at(earth) is called", () => {
    expect(() =>
      (RashdQibla(2025) as unknown as { at(earth: Earth): unknown }).at(jakarta)
    ).toThrow();
  });

  it("throws when at(earth) is called before with(algo)", () => {
    expect(() => RashdQibla(new Time(2025, 6, 1)).at(jakarta)).toThrow(
      /with\(algo\)/
    );
  });
});