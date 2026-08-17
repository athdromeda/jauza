import { asin, atan2, cos, sin } from "../math/trigonometry.js";
import { eclipticOfDate } from "./position.js";
import type {
  CartesianPosition,
  Frame,
  Origin,
  Position,
  SphericalPosition,
} from "./position.js";
import { Vec3 } from "./vec3.js";
import {
  ORIGIN_FOR,
  type AlgoConfig,
  type AlgoOutput,
  type BodyConfig,
} from "../types.js";

function describeFrame(f: Frame): string {
  return `${f.type}/${f.equinox}`;
}

export function assertSameFrame(a: Frame, b: Frame): void {
  if (a.type !== b.type || a.equinox !== b.equinox) {
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
    frame: pos.frame,
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
    frame: pos.frame,
  };
}

export type OriginResolver = {
  readonly frame: Frame;
  delta(from: Origin, to: Origin): Vec3;
};

export function createResolver(
  edges: Partial<Record<Origin, Position>>
): OriginResolver {
  const frame = eclipticOfDate;

  const neg = (v: Vec3) => new Vec3(-v.x, -v.y, -v.z);

  const posAt = (body: Origin, at: Origin): Vec3 => {
    if (body === at) return new Vec3(0, 0, 0);
    const sumUp = (child: Origin, ancestor: Origin): Vec3 | null => {
      let sum = new Vec3(0, 0, 0);
      let cur: Origin | undefined = child;
      while (cur !== undefined) {
        const edge: Position | undefined = edges[cur];
        if (!edge) break;
        assertSameFrame(edge.frame, frame);
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

  return {
    frame,
    delta(from, to) {
      return neg(posAt(to, from));
    },
  };
}

export function toOrigin(
  pos: Position,
  target: Origin,
  resolver: OriginResolver
): Position {
  assertSameFrame(pos.frame, resolver.frame);
  if (pos.origin === target) return pos;
  const vec3 = toCartesian(pos).representation.vec3;
  return {
    representation: {
      kind: "cartesian",
      vec3: vec3.add(resolver.delta(pos.origin, target)),
    },
    origin: target,
    frame: pos.frame,
  };
}

export function relative(
  observer: Position,
  target: Position,
  resolver: OriginResolver
): Position {
  assertSameFrame(observer.frame, target.frame);
  const atObserverOrigin = toOrigin(target, observer.origin, resolver);
  const vec3 =
    atObserverOrigin.representation.kind === "cartesian"
      ? atObserverOrigin.representation.vec3
      : toCartesian(atObserverOrigin).representation.vec3;
  const observerVec3 = toCartesian(observer).representation.vec3;
  return {
    representation: { kind: "cartesian", vec3: vec3.sub(observerVec3) },
    origin: observer.origin,
    frame: observer.frame,
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
    frame: cfg.frame,
  };
}

export function buildResolver(algo: AlgoConfig, jd: number): OriginResolver {
  const edges: Partial<Record<Origin, Position>> = {};
  for (const body of algo.bodies) {
    const cfg = algo[body];
    if (!cfg) continue;
    const child = ORIGIN_FOR[body];
    if (child === cfg.origin) continue;
    edges[child] = toPosition(cfg.formula({ jd }), cfg);
  }
  return createResolver(edges);
}

// custom errors

export class FrameMismatchError extends Error {
  constructor(a: Frame, b: Frame) {
    super(`Frame mismatch: ${describeFrame(a)} vs ${describeFrame(b)}`);
    this.name = "FrameMismatchError";
  }
}

export class MissingOriginOffsetError extends Error {
  constructor(path: string) {
    super(`No origin-offset path: ${path}`);
    this.name = "MissingOriginOffsetError";
  }
}
