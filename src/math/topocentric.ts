import { DMS } from "../modules/angle.js";
import type { HorizontalValues } from "../types.js";
import { atan2, cos, sin } from "./trigonometry.js";
import { normalizeAngle } from "./unit.js";

export type CartesianTuple = readonly [x: number, y: number, z: number];

export type ObserverLocation = {
  latitude: number;
  longitude: number;
  elevationM: number;
};

export type TopocentricErrorReason =
  | "invalid-observer"
  | "missing-distance"
  | "invalid-distance";

export class TopocentricPositionError extends Error {
  readonly reason: TopocentricErrorReason;

  constructor(reason: TopocentricErrorReason, message: string) {
    super(message);
    this.name = "TopocentricPositionError";
    this.reason = reason;
  }
}

export const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

/**
 * Geocentric equatorial position of an observer at a geodetic latitude,
 * longitude (east positive) and elevation in metres, expressed in the true
 * equatorial frame whose right ascension origin is the equinox used by the
 * supplied Greenwich apparent sidereal time. Units: kilometres.
 */
export function observerEquatorialPosition(
  observer: ObserverLocation,
  gastHours: number
): CartesianTuple {
  if (!Number.isFinite(observer.latitude) || Math.abs(observer.latitude) > 90) {
    throw new TopocentricPositionError(
      "invalid-observer",
      `Observer latitude must be finite and within [-90, 90]; got ${observer.latitude}`
    );
  }
  if (!Number.isFinite(observer.longitude)) {
    throw new TopocentricPositionError(
      "invalid-observer",
      `Observer longitude must be finite; got ${observer.longitude}`
    );
  }
  if (!Number.isFinite(observer.elevationM)) {
    throw new TopocentricPositionError(
      "invalid-observer",
      `Observer elevation must be finite; got ${observer.elevationM}`
    );
  }
  if (!Number.isFinite(gastHours)) {
    throw new TopocentricPositionError(
      "invalid-observer",
      `Greenwich apparent sidereal time must be finite; got ${gastHours}`
    );
  }

  const phi = observer.latitude;
  const hKm = observer.elevationM / 1000;
  const theta = (gastHours + observer.longitude / 15) * 15;

  const sinPhi = sin(phi);
  const N = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * sinPhi * sinPhi);

  const x = (N + hKm) * cos(phi) * cos(theta);
  const y = (N + hKm) * cos(phi) * sin(theta);
  const z = (N * (1 - WGS84_E2) + hKm) * sinPhi;

  return [x, y, z];
}

/**
 * Topocentric horizontal coordinates (altitude/azimuth) of a target whose
 * geocentric position is given in true-equatorial Cartesian kilometres.
 *
 * The target vector is taken relative to the Earth's centre in the same frame
 * as `gastHours`. The observer's WGS-84 position is subtracted to obtain the
 * topocentric vector, then rotated into local east/north/up coordinates.
 *
 * Result is geometric (unrefracted). Azimuth counts from north through east.
 * Missing or non-finite target distance throws instead of degrading to a
 * geocentric value.
 */
export function topocentricHorizontal(
  targetEquatorialKm: CartesianTuple,
  observer: ObserverLocation,
  gastHours: number
): HorizontalValues {
  const [tx, ty, tz] = targetEquatorialKm;
  if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(tz)) {
    throw new TopocentricPositionError(
      "invalid-distance",
      `Target distance must be finite; got ${tx}, ${ty}, ${tz}`
    );
  }
  const distSq = tx * tx + ty * ty + tz * tz;
  if (distSq <= 0) {
    throw new TopocentricPositionError(
      "missing-distance",
      "Target distance must be positive; got a zero vector"
    );
  }

  const [ox, oy, oz] = observerEquatorialPosition(observer, gastHours);
  const x = tx - ox;
  const y = ty - oy;
  const z = tz - oz;

  const phi = observer.latitude;
  const theta = (gastHours + observer.longitude / 15) * 15;

  const east = -sin(theta) * x + cos(theta) * y;
  const north =
    -sin(phi) * cos(theta) * x - sin(phi) * sin(theta) * y + cos(phi) * z;
  const up =
    cos(phi) * cos(theta) * x + cos(phi) * sin(theta) * y + sin(phi) * z;

  const az = normalizeAngle(atan2(east, north), 0, 360);
  const alt = atan2(up, Math.hypot(east, north));

  return { az: new DMS(az), alt: new DMS(alt) };
}