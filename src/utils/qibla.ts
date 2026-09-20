import { atan, atan2, cos, sin, tan } from "../math/trigonometry.js";
import { normalizeAngle } from "../math/unit.js";

export interface QiblaOptions {
  method?: "SPHERICAL" | "VINCENTY";
  kaabaLat?: number;
  kaabaLng?: number;
}

const KAABA_LNG = 39.82616111;
const KAABA_LAT = 21.42250833;

// vincenty constants
const FLATTENING = 1 / 298.257223563;
const RAD_TO_DEG = 180 / Math.PI;
const MAX_ITERATIONS = 200;
const LAMBDA_TOLERANCE = 1e-9;

export type QiblaMethod = (
  lat: number,
  lng: number,
  kaabaLat?: number,
  kaabaLng?: number
) => number;

export const spherical: QiblaMethod = (
  lat: number,
  lng: number,
  kaabaLat: number = KAABA_LAT,
  kaabaLng: number = KAABA_LNG
) => {
  const deltaLng = kaabaLng - lng;
  const numerator = sin(deltaLng);
  const denominator = cos(lat) * tan(kaabaLat) - sin(lat) * cos(deltaLng);
  return normalizeAngle(atan2(numerator, denominator));
};

export const vincenty: QiblaMethod = (
  lat: number,
  lng: number,
  kaabaLat: number = KAABA_LAT,
  kaabaLng: number = KAABA_LNG
) => {
  const phi1 = lat;
  const phi2 = kaabaLat;
  const L = kaabaLng - lng;

  const u1 = atan((1 - FLATTENING) * tan(phi1));
  const u2 = atan((1 - FLATTENING) * tan(phi2));
  const sinU1 = sin(u1);
  const cosU1 = cos(u1);
  const sinU2 = sin(u2);
  const cosU2 = cos(u2);

  let lam = L;
  let lamPrev = 0;
  let iterations = 0;

  do {
    const sinLam = sin(lam);
    const cosLam = cos(lam);

    const sinSigma = Math.hypot(
      cosU2 * sinLam,
      cosU1 * sinU2 - sinU1 * cosU2 * cosLam
    );
    const cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLam;
    const sigma = atan2(sinSigma, cosSigma);

    const sinAlpha = (cosU1 * cosU2 * sinLam) / sinSigma;
    const cosSqAlpha = 1 - sinAlpha * sinAlpha;

    const cosTwoSigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

    const c =
      (FLATTENING / 16) * cosSqAlpha * (4 + FLATTENING * (4 - 3 * cosSqAlpha));

    lamPrev = lam;
    lam =
      L +
      (1 - c) *
        FLATTENING *
        sinAlpha *
        (sigma +
          RAD_TO_DEG *
            c *
            sinSigma *
            (cosTwoSigmaM +
              c * cosSigma * (-1 + 2 * cosTwoSigmaM * cosTwoSigmaM)));
  } while (
    Math.abs(lam - lamPrev) > LAMBDA_TOLERANCE &&
    ++iterations < MAX_ITERATIONS
  );

  const alpha1 = atan2(
    cosU2 * sin(lam),
    cosU1 * sinU2 - sinU1 * cosU2 * cos(lam)
  );

  return normalizeAngle(alpha1);
};

export function getQibla(lat: number, lng: number, options?: QiblaOptions) {
  const kaabaLat = options?.kaabaLat ?? KAABA_LAT;
  const kaabaLng = options?.kaabaLng ?? KAABA_LNG;

  if (options?.method === "VINCENTY") {
    return vincenty(lat, lng, kaabaLat, kaabaLng);
  }

  return spherical(lat, lng, kaabaLat, kaabaLng);
}
