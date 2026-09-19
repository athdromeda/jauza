import type { AlgoConfig, BodyType, AlgoOutput, ConjunctionFn } from "./types.js";
export type { ConjunctionFn };
import type {
  Origin,
  Position,
  Reference,
  System,
} from "./modules/position.js";
import { toCartesian } from "./modules/transform.js";
import { Vec3 } from "./modules/vec3.js";

export type TimeScale = "UTC" | "TT" | "TDB";

export type Correction =
  | "precession"
  | "nutation"
  | "light-time"
  | "stellar-aberration"
  | "solar-deflection"
  | "topocentric"
  | "annual-aberration";

export type CoordinateStateKey = {
  readonly system: System;
  readonly reference: Reference; // frame+orientation
  readonly center: Origin; // never the target of an edge this round (provenance only)
};

export type CoordinateState<V> = {
  readonly key: CoordinateStateKey;
  readonly position: Position; // system/reference from key, origin = key.center
  readonly value: V;
  readonly body: BodyType;
  readonly epoch: number; // jd the state was computed at
  readonly timeScale: TimeScale;
  readonly metadata: Record<string, unknown>;
};

export function keyOf(
  seed: { position: Position } | CoordinateStateKey | Position
): CoordinateStateKey {
  if ("position" in seed) {
    return {
      system: seed.position.system,
      reference: seed.position.reference,
      center: seed.position.origin,
    };
  }
  if ("representation" in seed) {
    return {
      system: seed.system,
      reference: seed.reference,
      center: seed.origin,
    };
  }
  return seed;
}

export type ResolutionStep = {
  readonly label: string; // e.g. "equatorial-ecliptic", "precession J2000->date", "nutation mean->true"
  readonly from: CoordinateStateKey;
  readonly to: CoordinateStateKey;
  readonly corrections: Correction[]; // vocab contributed ([] for frame edges)
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type Provenance = {
  readonly algorithm: string;
  readonly jd: number;
  readonly timeScale: TimeScale;
  readonly steps: ResolutionStep[];
};

export type TransformationEdge = {
  readonly from: CoordinateStateKey;
  readonly to: CoordinateStateKey;
  readonly cost: number;
  readonly label?: string;
  readonly correction?: Correction; // set for correction edges; frame edges omit
  readonly apply: (value: Vec3, jd: number) => Vec3;
};

export type TransformationContext = {
  readonly jd: number;
  readonly timeScale: TimeScale;
  readonly algorithm?: string;
};

export type ResolutionPlan = {
  readonly seed: CoordinateState<Vec3>;
  readonly target: CoordinateStateKey;
  readonly path: ResolutionStep[];
  readonly provenance: Provenance;
};

export type RequiredAlgorithmMetadata = {
  readonly timeScale: TimeScale;
  readonly epoch: "mean-of-date" | "j2000";
};

export type ValidityDomain = {
  readonly from?: number;
  readonly to?: number;
  readonly note?: string;
};

export type ExtendedAlgorithmMetadata = RequiredAlgorithmMetadata & {
  readonly validity?: ValidityDomain;
  readonly corrections?: Correction[];
  readonly transformations?: TransformationEdge[];
};

export type AlgorithmAdapter<O extends AlgoOutput = AlgoOutput> = AlgoConfig & {
  readonly metadata: ExtendedAlgorithmMetadata;
  readonly conjunction?: ConjunctionFn;
};

export function coordinateState(
  position: Position,
  body: BodyType,
  epoch: number,
  timeScale: TimeScale,
  metadata: Record<string, unknown> = {}
): CoordinateState<Vec3> {
  const v = toCartesian(position).representation.vec3;
  return {
    key: keyOf(position),
    position,
    value: new Vec3(v.x, v.y, v.z),
    body,
    epoch,
    timeScale,
    metadata,
  };
}
