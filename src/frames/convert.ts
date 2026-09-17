import {
  type Position,
  type Reference,
  type System,
} from "../modules/position.js";
import { asin, atan2, cos, sin, tan } from "../math/trigonometry.js";
import { toCartesian, referencesEqual } from "../modules/transform.js";
import { Vec3 } from "../modules/vec3.js";
import { J2000_OBLIQUITY, meanObliquity } from "../transformations/obliquity.js";
import { nutationAngles, trueObliquity } from "../transformations/nutation.js";
import {
  precessEquatorialDateToJ2000,
  precessEquatorialJ2000ToDate,
} from "../transformations/precession.js";

// Rotation from equatorial axes to ecliptic axes about the x-axis (IAU).
export const equatorialToEclipticCart = (
  x: number,
  y: number,
  z: number,
  epsilon: number
): [number, number, number] => [
  x,
  y * cos(epsilon) + z * sin(epsilon),
  -y * sin(epsilon) + z * cos(epsilon),
];

// Inverse: from ecliptic axes to equatorial axes (about the x-axis by -epsilon).
export const eclipticToEquatorialCart = (
  x: number,
  y: number,
  z: number,
  epsilon: number
): [number, number, number] => [
  x,
  y * cos(epsilon) - z * sin(epsilon),
  y * sin(epsilon) + z * cos(epsilon),
];

export const cartToSph = (
  x: number,
  y: number,
  z: number
): [number, number, number] => {
  const r = Math.sqrt(x * x + y * y + z * z);
  return [atan2(y, x), asin(z / r), r];
};

export const sphToCart = (
  lon: number,
  lat: number,
  r: number
): [number, number, number] => [
  r * cos(lat) * cos(lon),
  r * cos(lat) * sin(lon),
  r * sin(lat),
];

// Meeus ch. 23 differential nutation in equatorial axes.
// sign: +1 mean->true, -1 true->mean.
export function rotateNutationEquatorial(
  x: number,
  y: number,
  z: number,
  jd: number,
  sign: 1 | -1
): [number, number, number] {
  const [lon, lat, r] = cartToSph(x, y, z);
  const { dpsi, deps } = nutationAngles(jd);
  const eps = meanObliquity(jd);
  const tl = tan(lat);
  const da =
    sign *
    (dpsi * (cos(eps) + sin(eps) * sin(lon) * tl) - deps * cos(lon) * tl);
  const dd = sign * (dpsi * sin(eps) * cos(lon) + deps * sin(lon));
  return sphToCart(lon + da, lat + dd, r);
}

export const obliquityForReference = (
  reference: Reference,
  jd: number
): number => {
  if (reference.frame === "j2000") return J2000_OBLIQUITY;
  if (reference.frame === "true-of-date") return trueObliquity(jd);
  return meanObliquity(jd);
};

export function toFrame(
  pos: Position,
  system: System,
  reference: Reference,
  jd: number
): Position {
  if (pos.system === system && referencesEqual(pos.reference, reference)) {
    return pos;
  }

  const c = toCartesian(pos).representation.vec3;
  let v: [number, number, number] = [c.x, c.y, c.z];

  // 1. Source system -> equatorial axes of the source epoch/true-ness.
  if (pos.system === "ecliptic") {
    v = eclipticToEquatorialCart(
      v[0],
      v[1],
      v[2],
      obliquityForReference(pos.reference, jd)
    );
  }

  // 2. Remove nutation when the source is already true-of-date.
  if (pos.reference.frame === "true-of-date") {
    v = rotateNutationEquatorial(v[0], v[1], v[2], jd, -1);
  }

  // 3. Precess between the J2000 and of-date equinoxes.
  const srcIsJ2000 = pos.reference.frame === "j2000";
  const tgtIsJ2000 = reference.frame === "j2000";
  if (srcIsJ2000 && !tgtIsJ2000) {
    const p = precessEquatorialJ2000ToDate(new Vec3(v[0], v[1], v[2]), jd);
    v = [p.x, p.y, p.z];
  } else if (!srcIsJ2000 && tgtIsJ2000) {
    const p = precessEquatorialDateToJ2000(new Vec3(v[0], v[1], v[2]), jd);
    v = [p.x, p.y, p.z];
  }

  // 4. Add nutation when targeting true-of-date.
  if (reference.frame === "true-of-date") {
    v = rotateNutationEquatorial(v[0], v[1], v[2], jd, 1);
  }

  // 5. Equatorial axes -> target system.
  if (system === "ecliptic") {
    v = equatorialToEclipticCart(
      v[0],
      v[1],
      v[2],
      obliquityForReference(reference, jd)
    );
  }

  return {
    representation: { kind: "cartesian", vec3: new Vec3(v[0], v[1], v[2]) },
    origin: pos.origin,
    system,
    reference,
  };
}