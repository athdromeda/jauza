import { cos, sin } from "../../math/trigonometry.js";
import { normalizeAngle } from "../../math/unit.js";
import { meanEclipticOfDate, trueEclipticOfDate } from "../../modules/position.js";
import {
  cartToSph,
  sphToCart,
} from "../../frames/convert.js";
import {
  type AlgorithmAdapter,
  type ExtendedAlgorithmMetadata,
  type TransformationEdge,
} from "../../contract.js";
import type { HeliocentricEcliptic } from "../../types.js";
import { Vec3 } from "../../modules/vec3.js";

function earth(input: { jd: number }) {
  const { jd } = input;
  const T = (jd - 2451545) / 36525;

  const L0 = 280.46645 + 36000.76983 * T;
  const M0 = 357.5291 + 35999.0503 * T;

  const C =
    (1.9146 - 0.0048 * T) * sin(M0) +
    (0.02 - 0.0001 * T) * sin(2 * M0) +
    0.0003 * sin(3 * M0);

  const e = 0.0167086 - 0.000042 * T;
  const L = normalizeAngle(L0 + C);
  const M = normalizeAngle(M0 + C);

  // Geocentric ecliptic coordinates
  const lambda = L;
  const beta = 0;
  const r = (1.000001018 * (1 - e * e)) / (1 + e * cos(M));

  // Heliocentric ecliptic coordinates
  const l = normalizeAngle(lambda + 180);
  const b = -beta;

  return {
    l,
    b,
    r,
  };
}

function sun(input: { jd: number }) {
  return {
    l: 0,
    b: 0,
    r: 0,
  };
}

const annualAberration: TransformationEdge = {
  from: { system: "ecliptic", reference: trueEclipticOfDate, center: "earth" },
  to: { system: "ecliptic", reference: trueEclipticOfDate, center: "earth" },
  cost: 0.1,
  correction: "annual-aberration",
  label: "annual aberration (Meeus 24.a)",
  apply: (v: Vec3) => {
    const [lon, lat, r] = cartToSph(v.x, v.y, v.z);
    const [x, y, z] = sphToCart(lon - 0.00569, lat, r);
    return new Vec3(x, y, z);
  },
};

const metadata: ExtendedAlgorithmMetadata = {
  timeScale: "TDB",
  epoch: "mean-of-date",
  validity: { note: "1970..2030 (low precision)" },
  corrections: [],
  transformations: [annualAberration],
};

export const meeusLow: AlgorithmAdapter<HeliocentricEcliptic> = {
  name: "Meeus Low-Precision Sun",
  metadata,
  bodies: ["SUN", "EARTH"],
  EARTH: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    formula: earth,
  },
  SUN: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: meanEclipticOfDate,
    formula: sun,
  },
};
