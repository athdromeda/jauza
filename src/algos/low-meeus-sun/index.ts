import { cos, sin } from "../../math/trigonometry.js";
import { normalizeAngle } from "../../math/unit.js";
import { Time } from "../../modules/time.js";
import type { AlgoConfig, HeliocentricEcliptic } from "../../types.js";
import { getDeltaT } from "../../utils/time.js";

function earth(input: { jd: number }): HeliocentricEcliptic {
  const { jd } = input;
  const year = new Time(jd).year;
  const jde = jd + getDeltaT(year) / 86400;
  const T = (jde - 2451545) / 36525;

  const L0 = 280.46645 + 36000.76983 * T;
  const M0 = 357.5291 + 35999.0503 * T;

  const C =
    (1.9146 - 0.0048 * T) * sin(M0) +
    (0.02 - 0.0001 * T) * sin(2 * M0) +
    0.0003 * sin(3 * M0);

  const e = 0.0167086 - 0.000042 * T;
  const L = normalizeAngle(L0 + C);
  const M = normalizeAngle(M0 + C);

  const omega = 125.04452 - 1934.13626 * T;
  const epsilon0 = 23.43929111 - 0.01300417 * T;
  const deltaEpsilon = 0.002555556 * cos(omega) + 0.00015833 * cos(2 * L0);
  const epsilon = epsilon0 + deltaEpsilon;

  // Geocentric ecliptic coordinates
  const lambda = L;
  const beta = 0;
  const r = (1.000001018 * (1 - e * e)) / (1 + e * cos(M));

  // Heliocentric ecliptic coordinates
  const l = normalizeAngle(lambda + 180);
  const b = -beta;
  // console.log("earth", {
  //   jd,
  //   jde,
  //   T,
  //   deltaT: getDeltaT(year),
  //   L0,
  //   M0,
  //   C,
  //   e,
  //   L,
  //   M,
  //   epsilon,
  //   lambda,
  //   beta,
  //   r,
  //   l,
  //   b,
  // });

  return {
    l,
    b,
    epsilon,
    r,
    corrections: {
      aberration: {
        lon: -0.00569,
        lat: 0,
      },
      nutation: {
        lon: -0.00478 * sin(omega),
        obl: 0,
      },
    },
  };
}

function sun(input: { jd: number }) {
  return {
    l: 0,
    b: 0,
    r: 0,
  };
}

export const meeusLow: AlgoConfig = {
  name: "MeeusLow",
  bodies: ["SUN", "EARTH"],
  EARTH: {
    outputType: "ECLIPTIC",
    formula: earth,
  },
  SUN: {
    outputType: "ECLIPTIC",
    formula: sun,
  },
};
