import { asin, atan2, cos, sin } from "../math/trigonometry.js";
import { toFrame } from "../frames/convert.js";
import { meanEclipticOfDate } from "./position.js";
import type {
  CartesianPosition,
  Origin,
  Position,
  Reference,
  SphericalPosition,
  System,
} from "./position.js";
import { Vec3 } from "./vec3.js";
import {
  ORIGIN_FOR,
  type AlgoConfig,
  type AlgoOutput,
  type BodyConfig,
} from "../types.js";

function describeReference(r: Reference): string {
  return `${r.frame}/${r.orientation}`;
}

export function referencesEqual(a: Reference, b: Reference): boolean {
  return a.frame === b.frame && a.orientation === b.orientation;
}

export function assertSameReference(a: Reference, b: Reference): void {
  if (!referencesEqual(a, b)) {
    throw new FrameMismatchError(a, b);
  }
}

export function sphericalToCartesian(l: number, b: number, r: number): Vec3 {
  return new Vec3(r * cos(b) * cos(l), r * cos(b) * sin(l), r * sin(b));
}

export function toCartesian(pos: Position): CartesianPosition {
  if (pos.representation.kind === "cartesian") {
    return pos as CartesianPosition;
  }
  const { lon, lat, r } = pos.representation;
  return {
    representation: {
      kind: "cartesian",
      vec3: sphericalToCartesian(lon, lat, r),
    },
    origin: pos.origin,
    system: pos.system,
    reference: pos.reference,
  };
}

export function toSpherical(pos: Position): SphericalPosition {
  if (pos.representation.kind === "spherical") {
    return pos as SphericalPosition;
  }
  const { x, y, z } = pos.representation.vec3;
  const r = Math.sqrt(x * x + y * y + z * z);
  return {
    representation: {
      kind: "spherical",
      lon: atan2(y, x),
      lat: asin(z / r),
      r,
    },
    origin: pos.origin,
    system: pos.system,
    reference: pos.reference,
  };
}

export type OriginResolver = {
  readonly reference: Reference;
  readonly system: System;
  delta(from: Origin, to: Origin): Vec3;
};

const firstReferenceOfEdges = (
  edges: Partial<Record<Origin, Position>>
): Reference | undefined => {
  for (const key of Object.keys(edges) as Origin[]) {
    const edge = edges[key];
    if (edge) return edge.reference;
  }
  return undefined;
};

const firstSystemOfEdges = (
  edges: Partial<Record<Origin, Position>>
): System | undefined => {
  for (const key of Object.keys(edges) as Origin[]) {
    const edge = edges[key];
    if (edge) return edge.system;
  }
  return undefined;
};

export function createResolver(
  edges: Partial<Record<Origin, Position>>,
  reference: Reference = meanEclipticOfDate,
  system: System = "ecliptic"
): OriginResolver {
  const resolvedRef = reference ?? firstReferenceOfEdges(edges) ?? meanEclipticOfDate;
  const resolvedSystem = system ?? firstSystemOfEdges(edges) ?? "ecliptic";
  for (const key of Object.keys(edges) as Origin[]) {
    const edge = edges[key];
    if (edge) {
      assertSameReference(edge.reference, resolvedRef);
      if (edge.system !== resolvedSystem) {
        throw new FrameMismatchError(edge.reference, resolvedRef);
      }
    }
  }

  const neg = (v: Vec3) => new Vec3(-v.x, -v.y, -v.z);

  const posAt = (body: Origin, at: Origin): Vec3 => {
    if (body === at) return new Vec3(0, 0, 0);
    const sumUp = (child: Origin, ancestor: Origin): Vec3 | null => {
      let sum = new Vec3(0, 0, 0);
      let cur: Origin | undefined = child;
      while (cur !== undefined) {
        const edge: Position | undefined = edges[cur];
        if (!edge) break;
        assertSameReference(edge.reference, resolvedRef);
        sum = sum.add(toCartesian(edge).representation.vec3);
        cur = edge.origin;
        if (cur === ancestor) return sum;
      }
      return null;
    };

    const up = sumUp(body, at);
    if (up) return up;
    const down = sumUp(at, body);
    if (down) return neg(down);
    throw new MissingOriginOffsetError(`${body}->${at}`);
  };

  const resolver: OriginResolver = {
    reference: resolvedRef,
    system: resolvedSystem,
    delta(from, to) {
      return neg(posAt(to, from));
    },
  };
  return resolver;
}

export function toOrigin(
  pos: Position,
  target: Origin,
  resolver: OriginResolver
): Position {
  assertSameReference(pos.reference, resolver.reference);
  if (pos.origin === target) return pos;
  const vec3 = toCartesian(pos).representation.vec3;
  return {
    representation: {
      kind: "cartesian",
      vec3: vec3.add(resolver.delta(pos.origin, target)),
    },
    origin: target,
    system: pos.system,
    reference: pos.reference,
  };
}

export function relative(
  observer: Position,
  target: Position,
  resolver: OriginResolver
): Position {
  assertSameReference(observer.reference, target.reference);
  const atObserverOrigin = toOrigin(target, observer.origin, resolver);
  const vec3 =
    atObserverOrigin.representation.kind === "cartesian"
      ? atObserverOrigin.representation.vec3
      : toCartesian(atObserverOrigin).representation.vec3;
  const observerVec3 = toCartesian(observer).representation.vec3;
  return {
    representation: { kind: "cartesian", vec3: vec3.sub(observerVec3) },
    origin: observer.origin,
    system: observer.system,
    reference: observer.reference,
  };
}

export function toPosition(out: AlgoOutput, cfg: BodyConfig): Position {
  const { l, b, r } =
    "l" in out
      ? { l: out.l, b: out.b, r: out.r }
      : { l: out.lambda, b: out.beta, r: out.r };
  return {
    representation: { kind: "cartesian", vec3: sphericalToCartesian(l, b, r) },
    origin: cfg.origin,
    system: cfg.system,
    reference: cfg.reference,
  };
}

export function canonicalize(
  pos: Position,
  cfg: BodyConfig,
  canonicalReference: Reference,
  canonicalSystem: System,
  jd: number
): Position {
  if (cfg.toCanonical) return cfg.toCanonical(pos, jd);
  return toFrame(pos, canonicalSystem, canonicalReference, jd);
}

export function buildResolver(
  algo: AlgoConfig,
  jd: number,
  canonicalReference: Reference = meanEclipticOfDate,
  canonicalSystem: System = "ecliptic"
): OriginResolver {
  const edges: Partial<Record<Origin, Position>> = {};
  for (const body of algo.bodies) {
    const cfg = algo[body];
    if (!cfg) continue;
    const child = ORIGIN_FOR[body];
    if (child === cfg.origin) continue;
    edges[child] = canonicalize(
      toPosition(cfg.formula({ jd }), cfg),
      cfg,
      canonicalReference,
      canonicalSystem,
      jd
    );
  }
  return createResolver(edges, canonicalReference, canonicalSystem);
}

// custom errors

export class FrameMismatchError extends Error {
  constructor(a: Reference, b: Reference) {
    super(`Reference mismatch: ${describeReference(a)} vs ${describeReference(b)}`);
    this.name = "FrameMismatchError";
  }
}

export class MissingOriginOffsetError extends Error {
  constructor(path: string) {
    super(`No origin-offset path: ${path}`);
    this.name = "MissingOriginOffsetError";
  }
}