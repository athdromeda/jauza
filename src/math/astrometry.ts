import { DMS } from "../modules/angle.js";
import type {
  EclipticValues,
  EquatorialValues,
  HorizontalValues,
} from "../types.js";
import { acos, asin, atan, atan2, cos, sin, tan } from "./trigonometry.js";
import { normalizeAngle } from "./unit.js";

export const getAngleBetweenVectors = (
  v1: [number, number, number],
  v2: [number, number, number]
) => {
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
  return acos(dot / (mag1 * mag2));
};

export const eclipticToXyz = (
  ecliptic: [number, number, number]
): [number, number, number] => {
  const [l, b, r] = ecliptic;
  const x = r * cos(b) * cos(l);
  const y = r * cos(b) * sin(l);
  const z = r * sin(b);
  return [x, y, z];
};

export const xyzToEcliptic = (
  xyz: [number, number, number]
): EclipticValues => {
  const [x, y, z] = xyz;
  const r = Math.sqrt(x * x + y * y + z * z);
  const l = atan2(y, x);
  const b = atan2(z, Math.sqrt(x * x + y * y));
  return {
    l: new DMS(l),
    b: new DMS(b),
    r,
  };
};

export const eclipticToEquatorial = (
  ecliptic: EclipticValues,
  epsilon: number = 23.5 // TODO: handle epsilon low-meeus
): EquatorialValues => {
  const { l: lambda, b: beta } = ecliptic;
  const alpha = atan2(
    sin(lambda.decimal) * cos(epsilon) - tan(beta.decimal) * sin(epsilon),
    cos(lambda.decimal)
  );

  const sinDelta =
    sin(beta.decimal) * cos(epsilon) +
    cos(beta.decimal) * sin(epsilon) * sin(lambda.decimal);
  const delta = asin(sinDelta);

  return {
    ra: new DMS(alpha),
    dec: new DMS(delta),
  };
};

export const equatorialToEcliptic = (
  equatorial: EquatorialValues,
  epsilon: number = 23.5
): EclipticValues => {
  const { ra: alpha, dec: delta } = equatorial;
  const sinBeta =
    sin(delta.decimal) * cos(epsilon) -
    cos(delta.decimal) * sin(epsilon) * sin(alpha.decimal);
  const beta = asin(sinBeta);
  const lambda = atan2(
    sin(alpha.decimal) * cos(epsilon) + tan(delta.decimal) * sin(epsilon),
    cos(alpha.decimal)
  );
  return {
    l: new DMS(lambda),
    b: new DMS(beta),
    r: 1,
  };
};

export const equatorialToHorizontal = (
  equatorial: EquatorialValues,
  latitude: number,
  hourAngle: number
): HorizontalValues => {
  const { ra: _alpha, dec: delta } = equatorial;
  const sinAlt =
    sin(delta.decimal) * sin(latitude) +
    cos(delta.decimal) * cos(latitude) * cos(hourAngle);
  const alt = asin(sinAlt);
  const az_s = atan2(
    sin(hourAngle),
    cos(hourAngle) * sin(latitude) - tan(delta.decimal) * cos(latitude)
  );
  const az = normalizeAngle(az_s - 180);

  return {
    az: new DMS(az),
    alt: new DMS(alt),
  };
};

export const getHA = (alt: number, lat: number, dec: number): number => {
  const cosHA = (sin(alt) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec));

  return acos(cosHA);
};
