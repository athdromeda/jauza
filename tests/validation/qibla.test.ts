import { describe, expect, test } from "vitest";
import { Qibla } from "../../src/modules/qibla.js";
import { spherical, vincenty } from "../../src/utils/qibla.js";
import { getQibla } from "../../src/utils/qibla.js";
import { KAABA_LAT, KAABA_LNG } from "../../src/data/qibla.js";

describe("Qibla direction", () => {
  test("should use the spherical method by default for Masjid Istiqlal", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
  });

  test("should use the vincenty method when configured with vincenty", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333).with(vincenty);
    expect(qibla.qibla).toBeCloseTo(295.0165212, 6);
  });

  test("should use the spherical method when configured with spherical", () => {
    const qibla = new Qibla(0, 0).with(spherical);
    expect(qibla.qibla).toBeCloseTo(58.5081754, 6);
  });

  test("with() should return the same instance", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.with(vincenty)).toBe(qibla);
  });

  test("with() should recompute after the value has been read", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
    expect(qibla.with(vincenty).qibla).toBeCloseTo(295.0165212, 6);
  });

  test("should honor positive and negative coordinate arrays", () => {
    const qibla = new Qibla([-6, 10, 11.2], [106, 49, 50.64]);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
  });

  test("should expose getQibla as a method", () => {
    const qibla = new Qibla(0, 0);
    expect(typeof qibla.getQibla).toBe("function");
  });
});

describe("Get Qibla Direction", () => {
  test("should return 295.1434579 degrees for Masjid Istiqlal", () => {
    //  Masjid Istiqlal
    // Lng = 106,8307333deg
    // Lat = –6,169777778deg

    const qibla = getQibla(-6.169777778, 106.8307333);
    expect(qibla).toBeCloseTo(295.1434579);
  });

  test("should return 288.412 degrees for Fukuoka, Japan", () => {
    // Fukuoka, Japan
    // Lng = 130,45deg
    // Lat = 33,5833deg

    const qibla = getQibla(33.5833, 130.45);
    expect(qibla).toBeCloseTo(288.412);
  });

  test("should return 58.5053 degrees for New York", () => {
    // New York
    // Lng = –73,9667deg
    // Lat = 40,7833deg

    const qibla = getQibla(40.7833, -73.9667);
    expect(qibla).toBeCloseTo(58.5053);
  });
});

describe("Get Qibla Direction (VINCENTY)", () => {
  // TODO: to be verified

  test("should return 295.0165212 degrees for Masjid Istiqlal", () => {
    const qibla = getQibla(-6.169777778, 106.8307333, { method: "VINCENTY" });
    expect(qibla).toBeCloseTo(295.0165212, 6);
  });

  test("should return 288.4775426 degrees for Fukuoka, Japan", () => {
    const qibla = getQibla(33.5833, 130.45, { method: "VINCENTY" });
    expect(qibla).toBeCloseTo(288.4775426, 6);
  });

  test("should return 58.4196176 degrees for New York", () => {
    const qibla = getQibla(40.7833, -73.9667, { method: "VINCENTY" });
    expect(qibla).toBeCloseTo(58.4196176, 6);
  });
});

describe("Get Qibla Direction with custom kaaba", () => {
  test("SPHERICAL should honor custom kaaba coordinates", () => {
    const qibla = getQibla(0, 0, { kaabaLat: 0, kaabaLng: 90 });
    expect(qibla).toBeCloseTo(90);
  });
});

describe("Qibla degenerate cases", () => {
  test("spherical returns NaN at the antipode of the Kaaba", () => {
    expect(Number.isNaN(spherical(-KAABA_LAT, KAABA_LNG + 180))).toBe(true);
  });

  test("spherical returns NaN at the Kaaba itself", () => {
    expect(Number.isNaN(spherical(KAABA_LAT, KAABA_LNG))).toBe(true);
  });

  test("vincenty returns NaN at the antipode of the Kaaba", () => {
    expect(Number.isNaN(vincenty(-KAABA_LAT, KAABA_LNG + 180))).toBe(true);
  });

  test("vincenty returns NaN at the Kaaba itself", () => {
    expect(Number.isNaN(vincenty(KAABA_LAT, KAABA_LNG))).toBe(true);
  });

  test("getQibla returns NaN at the antipode of the Kaaba", () => {
    expect(Number.isNaN(getQibla(-KAABA_LAT, KAABA_LNG + 180))).toBe(true);
  });

  test("custom kaaba: observer at its antipode returns NaN", () => {
    expect(Number.isNaN(spherical(0, -90, 0, 90))).toBe(true);
  });

  test("near-antipode still returns a valid bearing", () => {
    const lat = -KAABA_LAT + 0.0001;
    const lng = KAABA_LNG + 180;
    expect(Number.isNaN(spherical(lat, lng))).toBe(false);
    expect(Number.isNaN(vincenty(lat, lng))).toBe(false);
  });

  test("regression: 180deg longitude difference is a valid bearing", () => {
    expect(spherical(0, KAABA_LNG + 180)).toBeCloseTo(0, 6);
    expect(vincenty(0, KAABA_LNG + 180)).toBeCloseTo(0, 6);
  });
});
