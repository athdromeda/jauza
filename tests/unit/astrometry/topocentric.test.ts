import { describe, expect, it } from "vitest";
import {
  observerEquatorialPosition,
  topocentricHorizontal,
  TopocentricPositionError,
  type ObserverLocation,
} from "../../../src/math/topocentric.js";

const GAST0 = 0;

describe("observerEquatorialPosition", () => {
  it("places an equatorial sea-level observer on the equator at GAST 0", () => {
    const obs = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: 0 },
      GAST0
    );
    expect(obs[0]).toBeCloseTo(6378.137, 6);
    expect(obs[1]).toBeCloseTo(0, 9);
    expect(obs[2]).toBeCloseTo(0, 9);
  });

  it("places a polar observer at the polar radius", () => {
    const obs = observerEquatorialPosition(
      { latitude: 90, longitude: 0, elevationM: 0 },
      GAST0
    );
    expect(obs[0]).toBeCloseTo(0, 9);
    expect(obs[1]).toBeCloseTo(0, 9);
    // polar radius b = a*sqrt(1-e^2)
    const e2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
    expect(obs[2]).toBeCloseTo(6378.137 * Math.sqrt(1 - e2), 6);
  });

  it("rotates the observer with local apparent sidereal time", () => {
    const obs = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: 0 },
      6
    );
    // 6h GAST -> theta = 90°, observer moves from +x to +y
    expect(obs[0]).toBeCloseTo(0, 6);
    expect(obs[1]).toBeCloseTo(6378.137, 6);
  });

  it("shifts the radius by elevation (including below sea level)", () => {
    const sea = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: 0 },
      GAST0
    );
    const high = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: 1000 },
      GAST0
    );
    const deadSea = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: -430 },
      GAST0
    );
    expect(high[0] - sea[0]).toBeCloseTo(1, 9);
    expect(deadSea[0] - sea[0]).toBeCloseTo(-0.43, 9);
  });

  it("throws on invalid observer inputs", () => {
    expect(() =>
      observerEquatorialPosition({ latitude: 91, longitude: 0, elevationM: 0 }, GAST0)
    ).toThrow(TopocentricPositionError);
    expect(() =>
      observerEquatorialPosition({ latitude: NaN, longitude: 0, elevationM: 0 }, GAST0)
    ).toThrow(TopocentricPositionError);
    expect(() =>
      observerEquatorialPosition({ latitude: 0, longitude: Infinity, elevationM: 0 }, GAST0)
    ).toThrow(TopocentricPositionError);
    expect(() =>
      observerEquatorialPosition({ latitude: 0, longitude: 0, elevationM: NaN }, GAST0)
    ).toThrow(TopocentricPositionError);
    expect(() =>
      observerEquatorialPosition({ latitude: 0, longitude: 0, elevationM: 0 }, NaN)
    ).toThrow(TopocentricPositionError);
  });
});

// Build a target exactly overhead / on the horizon from a helper observer.
function zenithTarget(observer: ObserverLocation, gastHours: number): [number, number, number] {
  const [ox, oy, oz] = observerEquatorialPosition(observer, gastHours);
  const phi = observer.latitude;
  const theta = (gastHours + observer.longitude / 15) * 15;
  const dir: [number, number, number] = [
    Math.cos((phi * Math.PI) / 180) * Math.cos((theta * Math.PI) / 180),
    Math.cos((phi * Math.PI) / 180) * Math.sin((theta * Math.PI) / 180),
    Math.sin((phi * Math.PI) / 180),
  ];
  return [ox + dir[0], oy + dir[1], oz + dir[2]];
}

describe("topocentricHorizontal", () => {
  const observer: ObserverLocation = { latitude: 30, longitude: 0, elevationM: 0 };

  it("reports a target at the local zenith as altitude 90", () => {
    const target = zenithTarget(observer, 5);
    const h = topocentricHorizontal(target, observer, 5);
    expect(h.alt.decimal).toBeCloseTo(90, 4);
  });

  it("reports an east-horizon target as azimuth 90, altitude 0", () => {
    const [ox, oy, oz] = observerEquatorialPosition(observer, 5);
    const theta = 5 * 15;
    const east: [number, number, number] = [
      -Math.sin((theta * Math.PI) / 180),
      Math.cos((theta * Math.PI) / 180),
      0,
    ];
    const target = [ox + east[0], oy + east[1], oz + east[2]] as const;
    const h = topocentricHorizontal(target, observer, 5);
    expect(h.alt.decimal).toBeCloseTo(0, 6);
    expect(h.az.decimal).toBeCloseTo(90, 6);
  });

  it("reports a west-horizon target as azimuth 270", () => {
    const [ox, oy, oz] = observerEquatorialPosition(observer, 5);
    const theta = 5 * 15;
    const west: [number, number, number] = [
      Math.sin((theta * Math.PI) / 180),
      -Math.cos((theta * Math.PI) / 180),
      0,
    ];
    const target = [ox + west[0], oy + west[1], oz + west[2]] as const;
    const h = topocentricHorizontal(target, observer, 5);
    expect(h.alt.decimal).toBeCloseTo(0, 6);
    expect(h.az.decimal).toBeCloseTo(270, 6);
  });

  it("lowers a Moon at the geocentric horizon by its horizontal parallax (~0.95°)", () => {
    // Geocentric Moon due east, mean distance.
    const target: [number, number, number] = [0, 384400, 0];
    const h = topocentricHorizontal(target, { latitude: 0, longitude: 0, elevationM: 0 }, 0);
    // exact vector result: alt = atan2(-R, rho)
    const parallaxDeg = (Math.atan2(6378.137, 384400) * 180) / Math.PI;
    expect(h.alt.decimal).toBeCloseTo(-parallaxDeg, 5);
  });

  it("shows a body on the topocentric horizon has geocentric altitude ≈ +parallax", () => {
    const obs = observerEquatorialPosition(
      { latitude: 0, longitude: 0, elevationM: 0 },
      0
    );
    const target: [number, number, number] = [obs[0], obs[1] + 384400, obs[2]];
    const h = topocentricHorizontal(target, { latitude: 0, longitude: 0, elevationM: 0 }, 0);
    expect(h.alt.decimal).toBeCloseTo(0, 6);
    const geocentricAlt =
      (Math.asin(target[0] / Math.hypot(target[0], target[1], target[2])) * 180) /
      Math.PI;
    const parallaxDeg = (Math.atan2(6378.137, 384400) * 180) / Math.PI;
    expect(geocentricAlt).toBeCloseTo(parallaxDeg, 5);
  });

  it("shifts a Sun at 1 au by only its solar parallax (~8.8″)", () => {
    const target: [number, number, number] = [0, 149597870.7, 0];
    const h = topocentricHorizontal(target, { latitude: 0, longitude: 0, elevationM: 0 }, 0);
    const solarParallaxDeg = (Math.asin(6378.137 / 149597870.7) * 180) / Math.PI;
    expect(h.alt.decimal).toBeCloseTo(-solarParallaxDeg, 5);
  });

  it("barely changes geometric altitude with observer elevation (dip is separate)", () => {
    const target: [number, number, number] = [0, 384400, 0];
    const sea = topocentricHorizontal(target, { latitude: 0, longitude: 0, elevationM: 0 }, 0);
    const summit = topocentricHorizontal(
      target,
      { latitude: 0, longitude: 0, elevationM: 4000 },
      0
    );
    // The elevation itself moves the observer by ~4 km; for a body at ~384 400 km
    // that is a sub-arcsecond geometric-altitude change, not a dip correction.
    expect(Math.abs(summit.alt.decimal - sea.alt.decimal)).toBeLessThan(0.001);
  });

  it("throws on missing or invalid target distance", () => {
    expect(() =>
      topocentricHorizontal([0, 0, 0], observer, 5)
    ).toThrow(/missing-distance|positive/);
    expect(() =>
      topocentricHorizontal([NaN, 0, 0], observer, 5)
    ).toThrow(TopocentricPositionError);
    expect(() =>
      topocentricHorizontal([Infinity, 1, 1], observer, 5)
    ).toThrow(TopocentricPositionError);
  });
});