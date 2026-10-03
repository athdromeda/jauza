import type { BodyType, DistanceUnit } from "../types.js";
import { AU_KM, EARTH_RADIUS_KM } from "../math/unit.js";

const BODY_RADIUS_KM: Partial<Record<BodyType, number>> = {
  SUN: 696000,
  MOON: 1737.4,
};

// Mean semi-diameter, degrees (1 au for the sun, mean distance for the moon).
const MEAN_SD: Partial<Record<BodyType, number>> = {
  SUN: (Math.asin(BODY_RADIUS_KM.SUN! / AU_KM) * 180) / Math.PI,
  MOON: (Math.asin(BODY_RADIUS_KM.MOON! / 384400) * 180) / Math.PI,
};

const defaultUnit = (type: BodyType): DistanceUnit =>
  type === "MOON" ? "km" : "au";

/**
 * Semi-diameter of a body, degrees, from its geocentric distance `r`.
 * Defaults the distance unit per body (MOON → km, SUN → au); degrades to the
 * mean semi-diameter when `r` is missing or degenerate (e.g. `r: 0` algos).
 */
export function semiDiameter(
  type: BodyType,
  r: number,
  distanceUnit?: DistanceUnit
): number {
  const unit = distanceUnit ?? defaultUnit(type);
  if (!Number.isFinite(r) || r <= 0) {
    return MEAN_SD[type] ?? 0;
  }
  const radiusKm = BODY_RADIUS_KM[type];
  if (!radiusKm) return 0;
  const rKm =
    unit === "km"
      ? r
      : unit === "au"
        ? r * AU_KM
        : r * EARTH_RADIUS_KM;
  if (rKm <= radiusKm) return MEAN_SD[type] ?? 0;
  return (Math.asin(radiusKm / rKm) * 180) / Math.PI;
}