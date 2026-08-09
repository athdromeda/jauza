import { atan2, cos, sin, tan } from "../math/trigonometry.js";
import { normalizeAngle } from "../math/unit.js";

export interface QiblaOptions {
  method: string;
  kaabaLat: number;
  kaabaLng: number;
}

const KAABA_LNG = 39.82616111;
const KAABA_LAT = 21.42250833;

export function getQibla(lat: number, lng: number, options?: QiblaOptions) {
  const deltaLng = KAABA_LNG - lng;
  const numerator = sin(deltaLng);
  const denominator = cos(lat) * tan(KAABA_LAT) - sin(lat) * cos(deltaLng);
  const value = normalizeAngle(atan2(numerator, denominator));

  console.table({
    lat,
    lng,
    deltaLng,
    numerator,
    denominator,
    value,
  });

  return value;
}
