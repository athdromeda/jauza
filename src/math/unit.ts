export const degToHms = (deg: number) => {
  const hours = Math.floor(deg / 15);
  const minutes = Math.floor((deg % 15) * 4);
  const seconds = Math.round(((deg % 15) * 4 - minutes) * 60);
  return { hours, minutes, seconds };
};

export const hmsToDeg = (hours: number, minutes: number, seconds: number) => {
  return hours * 15 + minutes * 0.25 + seconds * 0.004166666666666667;
};

export const decToHms = (dec: number) => {
  const hours = Math.floor(dec);
  const minutes = Math.floor((dec % 1) * 60);
  const seconds = Math.round(((dec % 1) * 60 - minutes) * 60);
  return { hours, minutes, seconds };
};

export const normalizeAngle = (
  angle: number,
  min: number = 0,
  max: number = 360
) => {
  const normalized = angle % (max - min);
  return normalized < min ? normalized + (max - min) : normalized;
};

export const normalizeHour = (hour: number) => {
  const normalized = hour % 24;
  return normalized < 0 ? normalized + 24 : normalized;
};

export const AU_KM = 149597870.7;
export const EARTH_RADIUS_KM = 6378.14;

export type DistanceUnitName = "km" | "au" | "earth-radii";

export class UnsupportedDistanceUnitError extends Error {
  readonly unit: unknown;

  constructor(unit: unknown) {
    super(`Unsupported distance unit: ${String(unit)}`);
    this.name = "UnsupportedDistanceUnitError";
    this.unit = unit;
  }
}

/**
 * Convert a distance to canonical kilometres per `unit`. Unknown units throw
 * so that nonconforming algorithm adapters fail loudly instead of producing
 * plausible-looking wrong magnitudes. Zero distance stays legal: algorithms
 * may publish `r: 0` as an origin marker.
 */
export const toKm = (r: number, unit: DistanceUnitName): number => {
  switch (unit) {
    case "km":
      return r;
    case "au":
      return r * AU_KM;
    case "earth-radii":
      return r * EARTH_RADIUS_KM;
    default:
      throw new UnsupportedDistanceUnitError(unit);
  }
};
