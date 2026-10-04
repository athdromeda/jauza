import { describe, expect, it } from "vitest";
import { cos, sin } from "../../../src/math/trigonometry.js";
import { WGS84_A_KM } from "../../../src/math/topocentric.js";
import { Earth } from "../../../src/modules/earth.js";
import { trueEquatorialOfDate } from "../../../src/modules/position.js";
import { Time } from "../../../src/modules/time.js";
import type { AlgoConfig } from "../../../src/types.js";
import {
  bestTime,
  computeVisibilityGeometry,
} from "../../../src/utils/visibility-geometry.js";

const AU_KM = 149597870.7;

// Synthetic geocentric true-of-date RA/Dec published as the native pair for both
// bodies, so the observer pipeline resolves the topocentric position from them.
const geometryAlgo = (
  sunRaDeg: number,
  moonRaDeg: number
): AlgoConfig => ({
  name: "synthetic-visibility-geometry",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: sunRaDeg, beta: 0, r: AU_KM }),
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({ lambda: moonRaDeg, beta: 0, r: 384400 }),
  },
});

// GAST ≈ 154.6° at JD 2460000.5. With dec = 0 at the equator, hour angle 95°
// puts the Sun ~5° below the western horizon and hour angle 88° puts the Moon
// ~2° above it.
const time = new Time(2460000.5);
const observer = new Earth(0, 0, 0);
const nearHorizonInput = {
  time,
  observer,
  sunAlgo: geometryAlgo(154.6 - 95, 154.6 - 88),
  moonAlgo: geometryAlgo(154.6 - 95, 154.6 - 88),
};

describe("bestTime", () => {
  it("computes sunset plus four ninths of lag", () => {
    const sunset = new Time(2460000.25);
    const moonset = new Time(2460000.25 + 90 / 1440);
    expect(bestTime(sunset, moonset).jd).toBeCloseTo(
      sunset.jd + (4 / 9) * (90 / 1440),
      12
    );
  });

  it("rejects negative lag", () => {
    expect(() => bestTime(new Time(2), new Time(1))).toThrow(RangeError);
  });
});

describe("computeVisibilityGeometry", () => {
  const geometry = computeVisibilityGeometry(nearHorizonInput);

  it("places the Sun below and the Moon above the near-horizon scene", () => {
    expect(geometry.geocentric.sunAltitudeDeg).toBeLessThan(-1);
    expect(geometry.geocentric.sunAltitudeDeg).toBeGreaterThan(-15);
    expect(geometry.geocentric.moonAltitudeDeg).toBeGreaterThan(0);
    expect(geometry.geocentric.moonAltitudeDeg).toBeLessThan(10);
  });

  it("keeps Yallop ARCV geocentric but Odeh topocentric", () => {
    expect(geometry.geocentric.arcvDeg).not.toBeCloseTo(
      geometry.topocentric.arcvDeg,
      2
    );
    // Parallax depresses the Moon (~57') far more than the Sun (~9"),
    // so the topocentric arc of vision is smaller than the geocentric one.
    expect(geometry.topocentric.arcvDeg).toBeLessThan(
      geometry.geocentric.arcvDeg
    );
    expect(geometry.topocentric.moonAltitudeDeg).toBeLessThan(
      geometry.geocentric.moonAltitudeDeg
    );
  });

  it("uses real lunar distance and arcminute parallax/semidiameter", () => {
    expect(geometry.moon.distanceKm).toBeCloseTo(384400, 0);
    const hp = (Math.asin(WGS84_A_KM / 384400) * 180) / Math.PI * 60;
    expect(geometry.moon.horizontalParallaxArcmin).toBeCloseTo(hp, 10);
    expect(geometry.moon.horizontalParallaxArcmin).toBeGreaterThan(50);
    expect(geometry.moon.horizontalParallaxArcmin).toBeLessThan(65);
    expect(geometry.moon.geocentricSemiDiameterArcmin).toBeCloseTo(
      0.27245 * hp,
      10
    );
    expect(geometry.moon.topocentricSemiDiameterArcmin).toBeCloseTo(
      geometry.moon.geocentricSemiDiameterArcmin *
        (1 + sin(geometry.geocentric.moonAltitudeDeg) * sin(hp / 60)),
      10
    );
  });

  it("wires Yallop width to geocentric ARCL and Odeh width to topocentric ARCL", () => {
    expect(geometry.yallopWidthArcmin).toBeCloseTo(
      geometry.moon.topocentricSemiDiameterArcmin *
        (1 - cos(geometry.geocentric.arclDeg)),
      12
    );
    expect(geometry.odehWidthArcmin).toBeCloseTo(
      geometry.moon.topocentricSemiDiameterArcmin *
        (1 - cos(geometry.topocentric.arclDeg)),
      12
    );
    expect(geometry.yallopWidthArcmin).toBeGreaterThanOrEqual(0);
    expect(geometry.odehWidthArcmin).toBeGreaterThanOrEqual(0);
  });

  it("rejects an invalid lunar distance", () => {
    const badMoon: AlgoConfig = {
      name: "bad-moon-distance",
      bodies: ["MOON"],
      MOON: {
        outputType: "ECLIPTIC",
        origin: "earth",
        system: "equatorial",
        reference: trueEquatorialOfDate,
        distanceUnit: "km",
        formula: () => ({ lambda: 0, beta: 0, r: 0 }),
      },
    };
    expect(() =>
      computeVisibilityGeometry({
        ...nearHorizonInput,
        moonAlgo: badMoon,
      })
    ).toThrow(RangeError);
  });
});