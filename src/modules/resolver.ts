import {
  keyOf,
  type CoordinateState,
  type CoordinateStateKey,
  type ResolutionPlan,
  type ResolutionStep,
  type TransformationContext,
  type TransformationEdge,
} from "../contract.js";
import type { EdgeRegistry } from "../frames/registry.js";
import { Vec3 } from "./vec3.js";

export class UnsupportedTransformationError extends Error {
  constructor(from: CoordinateStateKey, to: CoordinateStateKey) {
    super(
      `Unsupported transformation: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`
    );
    this.name = "UnsupportedTransformationError";
  }
}

export class DuplicateCorrectionError extends Error {
  constructor(vocab: string) {
    super(`Duplicate correction vocabulary: "${vocab}"`);
    this.name = "DuplicateCorrectionError";
  }
}

type NodeKey = string;
const keyS = (k: CoordinateStateKey) =>
  `${k.system}|${k.reference.frame}|${k.reference.orientation}|${k.center}`;

const parseKey = (s: string): CoordinateStateKey => {
  const [system, frame, orientation, center] = s.split("|");
  return {
    system: system as CoordinateStateKey["system"],
    reference: {
      frame: frame as "j2000" | "mean-of-date" | "true-of-date",
      orientation: orientation as "fixed" | "mean" | "true",
    },
    center: center as CoordinateStateKey["center"],
  };
};

export const edgeLabel = (e: TransformationEdge) =>
  e.label ??
  (e.correction
    ? `correction:${e.correction}`
    : `${e.from.system}/${e.to.system}:${e.from.reference.frame}->${e.to.reference.frame}`);

const keysEqual = (a: CoordinateStateKey, b: CoordinateStateKey) =>
  a.system === b.system &&
  a.reference.frame === b.reference.frame &&
  a.reference.orientation === b.reference.orientation &&
  a.center === b.center;

const rekey = (
  state: CoordinateState<Vec3>,
  key: CoordinateStateKey,
  value: Vec3
): CoordinateState<Vec3> => ({
  ...state,
  key,
  value,
  position: {
    ...state.position,
    representation: { kind: "cartesian", vec3: value },
    system: key.system,
    reference: key.reference,
    origin: key.center,
  },
});

export type TracedStep = {
  readonly edge: TransformationEdge;
  readonly state: CoordinateState<Vec3>;
};

export type TracedResolutionPlan = ResolutionPlan & {
  readonly states: TracedStep[];
};

export class GraphResolver {
  #registry: EdgeRegistry;

  constructor(registry: EdgeRegistry) {
    this.#registry = registry;
  }

  #path(
    sourceKey: CoordinateStateKey,
    targetKey: CoordinateStateKey
  ): ResolutionStep[] {
    const start = keyS(sourceKey);
    const goal = keyS(targetKey);
    const dist = new Map<NodeKey, number>([[start, 0]]);
    const prev = new Map<NodeKey, { to: NodeKey; edge: TransformationEdge }>();
    const seen = new Set<NodeKey>();
    let current: NodeKey | undefined = start;
    while (current !== undefined && current !== goal) {
      seen.add(current);
      for (const edge of this.#registry.edgesFrom(parseKey(current))) {
        const nk = keyS(edge.to);
        const nd = dist.get(current)! + edge.cost;
        if (!dist.has(nk) || nd < dist.get(nk)!) {
          dist.set(nk, nd);
          prev.set(nk, { to: current, edge });
        }
      }
      current = [...dist.entries()]
        .filter(([k]) => !seen.has(k))
        .sort((a, b) => a[1] - b[1])[0]?.[0];
    }
    if (current !== goal) {
      throw new UnsupportedTransformationError(sourceKey, targetKey);
    }
    const steps: ResolutionStep[] = [];
    let nk = goal;
    while (nk !== start) {
      const step = prev.get(nk)!;
      steps.unshift({
        label: edgeLabel(step.edge),
        from: parseKey(step.to),
        to: parseKey(nk),
        corrections: step.edge.correction ? [step.edge.correction] : [],
      });
      nk = step.to;
    }
    return steps;
  }

  #trace(
    source: CoordinateState<Vec3>,
    targetKey: CoordinateStateKey,
    ctx: TransformationContext
  ): TracedStep[] {
    const steps = this.#path(keyOf(source), targetKey);
    let cur = source;
    const out: TracedStep[] = [];
    for (const s of steps) {
      const edge = this.#registry.find(s.from, s.to);
      if (!edge) {
        throw new UnsupportedTransformationError(s.from, s.to);
      }
      const nv = edge.apply(cur.value, ctx.jd);
      cur = rekey(cur, edge.to, new Vec3(nv.x, nv.y, nv.z));
      out.push({ edge, state: cur });
    }
    return out;
  }

  resolve(
    source: CoordinateState<Vec3>,
    target: CoordinateStateKey,
    ctx: TransformationContext
  ): TracedResolutionPlan {
    const path = this.#path(keyOf(source), target);
    return {
      seed: source,
      target,
      path,
      states: this.#trace(source, target, ctx),
      provenance: {
        algorithm: ctx.algorithm ?? "",
        jd: ctx.jd,
        timeScale: ctx.timeScale,
        steps: path,
      },
    };
  }

  explain(
    source: CoordinateState<Vec3>,
    target: CoordinateStateKey,
    ctx: TransformationContext
  ): TracedResolutionPlan {
    return this.resolve(source, target, ctx);
  }

  trace(
    source: CoordinateState<Vec3>,
    target: CoordinateStateKey,
    ctx: TransformationContext
  ): TracedStep[] {
    return this.#trace(source, target, ctx);
  }
}

export type CorrectionResult = {
  readonly state: CoordinateState<Vec3>;
  readonly steps: ResolutionStep[];
};

export function applyCorrections(
  seed: CoordinateState<Vec3>,
  ctx: TransformationContext,
  edges: TransformationEdge[],
  baseSteps: ResolutionStep[] = []
): CorrectionResult {
  const vocab = new Set<string>(baseSteps.flatMap((s) => s.corrections));
  let state = seed;
  const steps = [...baseSteps];
  for (const edge of edges) {
    if (!keysEqual(keyOf(state), edge.from)) {
      throw new UnsupportedTransformationError(keyOf(state), edge.from);
    }
    if (edge.correction && vocab.has(edge.correction)) {
      throw new DuplicateCorrectionError(edge.correction);
    }
    if (edge.correction) vocab.add(edge.correction);
    const nv = edge.apply(state.value, ctx.jd);
    state = rekey(state, edge.to, new Vec3(nv.x, nv.y, nv.z));
    steps.push({
      label: edgeLabel(edge),
      from: keyOf(state),
      to: edge.to,
      corrections: edge.correction ? [edge.correction] : [],
    });
  }
  return { state, steps };
}