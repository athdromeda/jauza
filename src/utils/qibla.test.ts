import { describe, expect, test } from "vitest";
import { getQibla } from "./qibla.js";

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
