import type {
  CoordinateStateKey,
  TransformationEdge,
} from "../contract.js";
import { keyOf } from "../contract.js";
import type { Origin, Orientation, System } from "../modules/position.js";
import { Vec3 } from "../modules/vec3.js";
import { J2000_OBLIQUITY, meanObliquity } from "../transformations/obliquity.js";
import { nutationAngles, trueObliquity } from "../transformations/nutation.js";
import {
  precessEquatorialDateToJ2000,
  precessEquatorialJ2000ToDate,
} from "../transformations/precession.js";
import {
  cartToSph,
  eclipticToEquatorialCart,
  equatorialToEclipticCart,
  rotateNutationEquatorial,
  sphToCart,
} from "./convert.js";

const keyString = (k: CoordinateStateKey) =>
  `${k.system}|${k.reference.frame}|${k.reference.orientation}|${k.center}`;

const parseKeyString = (s: string): CoordinateStateKey => {
  const [system, frame, orientation, center] = s.split("|");
  return {
    system: system as System,
    reference: {
      frame: frame as "j2000" | "mean-of-date" | "true-of-date",
      orientation: orientation as Orientation,
    },
    center: center as Origin,
  };
};

export class EdgeRegistry {
  #byFrom = new Map<string, Map<string, TransformationEdge>>();

  register(edge: TransformationEdge): this {
    const f = keyString(edge.from);
    const t = keyString(edge.to);
    let m = this.#byFrom.get(f);
    if (!m) {
      m = new Map();
      this.#byFrom.set(f, m);
    }
    m.set(t, edge);
    return this;
  }

  edgesFrom(key: CoordinateStateKey): TransformationEdge[] {
    return [...(this.#byFrom.get(keyString(key))?.values() ?? [])];
  }

  find(
    from: CoordinateStateKey,
    to: CoordinateStateKey
  ): TransformationEdge | undefined {
    return this.#byFrom.get(keyString(from))?.get(keyString(to));
  }

  keys(): CoordinateStateKey[] {
    return [...this.#byFrom.keys()].map(parseKeyString);
  }
}

type FrameName = "j2000" | "mean-of-date" | "true-of-date";

const obliquityFor = (
  reference: CoordinateStateKey["reference"],
  jd: number
): number =>
  reference.frame === "j2000"
    ? J2000_OBLIQUITY
    : reference.frame === "true-of-date"
      ? trueObliquity(jd)
      : meanObliquity(jd);

const mk = (
  system: System,
  frame: FrameName,
  orientation: Orientation,
  center: Origin
): CoordinateStateKey => ({
  system,
  reference: { frame, orientation },
  center,
});

const eclipticOf = (frame: FrameName, orientation: Orientation, center: Origin) =>
  mk("ecliptic", frame, orientation, center);

const equatorialOf = (
  frame: FrameName,
  orientation: Orientation,
  center: Origin
) => mk("equatorial", frame, orientation, center);

export function registerStandardEdges(
  registry: EdgeRegistry,
  center: Origin = "earth"
): EdgeRegistry {
  const C = center;

  const frames: Array<[FrameName, Orientation]> = [
    ["j2000", "fixed"],
    ["mean-of-date", "mean"],
    ["true-of-date", "true"],
  ];
  for (const [frame, orientation] of frames) {
    const ek = eclipticOf(frame, orientation, C);
    const eqk = equatorialOf(frame, orientation, C);
    registry.register({
      from: ek,
      to: eqk,
      cost: 1,
      apply: (v: Vec3, jd: number) => {
        const [x, y, z] = eclipticToEquatorialCart(
          v.x,
          v.y,
          v.z,
          obliquityFor({ frame, orientation }, jd)
        );
        return new Vec3(x, y, z);
      },
    });
    registry.register({
      from: eqk,
      to: ek,
      cost: 1,
      apply: (v: Vec3, jd: number) => {
        const [x, y, z] = equatorialToEclipticCart(
          v.x,
          v.y,
          v.z,
          obliquityFor({ frame, orientation }, jd)
        );
        return new Vec3(x, y, z);
      },
    });
  }

  // Precession: equatorial, J2000 <-> mean-of-date, both directions.
  const j = equatorialOf("j2000", "fixed", C);
  const m = equatorialOf("mean-of-date", "mean", C);
  registry.register({
    from: j,
    to: m,
    cost: 1,
    apply: (v: Vec3, jd: number) => precessEquatorialJ2000ToDate(v, jd),
  });
  registry.register({
    from: m,
    to: j,
    cost: 1,
    apply: (v: Vec3, jd: number) => precessEquatorialDateToJ2000(v, jd),
  });

  // Nutation: mean <-> true, both systems, both directions.
  const nut = (system: System, sign: 1 | -1, jd: number, v: Vec3): Vec3 => {
    if (system === "equatorial") {
      const [x, y, z] = rotateNutationEquatorial(v.x, v.y, v.z, jd, sign);
      return new Vec3(x, y, z);
    }
    const { dpsi } = nutationAngles(jd);
    const [lon, lat, r] = cartToSph(v.x, v.y, v.z);
    const [x, y, z] = sphToCart(lon + sign * dpsi, lat, r);
    return new Vec3(x, y, z);
  };
  for (const system of ["ecliptic", "equatorial"] as System[]) {
    const mean = mk(system, "mean-of-date", "mean", C);
    const truth = mk(system, "true-of-date", "true", C);
    registry.register({
      from: mean,
      to: truth,
      cost: 1.5,
      correction: "nutation",
      apply: (v: Vec3, jd: number) => nut(system, 1, jd, v),
    });
    registry.register({
      from: truth,
      to: mean,
      cost: 1.5,
      correction: "nutation",
      apply: (v: Vec3, jd: number) => nut(system, -1, jd, v),
    });
  }

  return registry;
}