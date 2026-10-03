import {
  coordinateState,
  type AlgorithmAdapter,
  type CoordinateState,
  type CoordinateStateKey,
  type Provenance,
  type ResolutionStep,
  type TransformationEdge,
} from "../contract.js";
import {
  type AlgoConfig,
  type AlgoOutput,
  type BodyType,
  type DistanceUnit,
  ORIGIN_FOR,
} from "../types.js";
import { normalizeAngle, toKm } from "../math/unit.js";
import {
  applyCorrections,
  edgeLabel,
  GraphResolver,
} from "./resolver.js";
import { DMS } from "./angle.js";
import {
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
  type Origin,
  type Position,
  type Reference,
} from "./position.js";
import type { OriginResolver } from "./transform.js";
import {
  buildResolver,
  canonicalize,
  createResolver,
  referencesEqual,
  relative,
  toPosition,
  toSpherical,
} from "./transform.js";
import { meanObliquity, trueObliquity } from "../transformations/obliquity.js";
import { toFrame } from "../frames/convert.js";
import { EdgeRegistry, registerStandardEdges } from "../frames/registry.js";
import {
  feedJd,
  feedScale,
  graphContext,
  graphJd,
} from "../frames/time-scale.js";
import type { Time } from "./time.js";
import { Vec3 } from "./vec3.js";

export type GeometricView = {
  readonly position: CoordinateState<Vec3>;
  readonly lambda: DMS;
  readonly beta: DMS;
  readonly r: number;
  /** Geocentric distance, always in kilometres (canonical, unit-independent). */
  readonly rKm: number;
  readonly ecliptic: {
    readonly l: DMS;
    readonly b: DMS;
    readonly r: number;
    readonly system: string;
    readonly reference: Reference;
  };
  readonly ra: DMS;
  readonly dec: DMS;
  readonly epsilon: number;
};

export abstract class Body {
  readonly type: BodyType;
  time: Time;
  source: Position;
  target: Position;
  resolver: OriginResolver;
  algo: AlgorithmAdapter | null = null;

  #registry: EdgeRegistry;
  #graph: GraphResolver;
  #geometricState: CoordinateState<Vec3> | null = null;
  #apparentState: CoordinateState<Vec3> | null = null;
  #dirty = true;
  /** Unit of the current geometric `r`, per the active algo's config. */
  #rUnit: DistanceUnit | undefined;
  /** Whether this body's own formula is an origin marker (`r === 0`), meaning
   * the observed distance magnitude comes from the *other* body's formula. */
  #sourceOriginMarker = false;

  constructor(time: Time, type: BodyType) {
    this.type = type;
    this.time = time;
    this.#registry = registerStandardEdges(
      new EdgeRegistry(),
      ORIGIN_FOR[type]
    );
    this.#graph = new GraphResolver(this.#registry);
    this.resolver = createResolver({});
    const home = this.homePosition;
    this.source = home;
    this.target = home;
  }

  get homeOrigin(): Origin {
    return ORIGIN_FOR[this.type];
  }

  get homePosition(): Position {
    return {
      representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
      origin: this.homeOrigin,
      system: this.resolver.system,
      reference: this.resolver.reference,
    };
  }

  /** Declared unit of the current geometric `r`, from the active algo config. */
  get distanceUnit(): DistanceUnit | undefined {
    return this.#rUnit;
  }

  get position(): CoordinateState<Vec3> {
    this.#compute();
    return this.#apparentState!;
  }

  get apparentState(): CoordinateState<Vec3> | null {
    this.#compute();
    return this.#apparentState;
  }

  geometric(): GeometricView {
    this.#compute();
    const s = this.#geometricState!;
    const body = this;
    return {
      get position() {
        return s;
      },
      get lambda() {
        return body.#readLambda(s);
      },
      get beta() {
        return body.#readBeta(s);
      },
      get r() {
        return body.#readEcliptic(s, meanEclipticOfDate).r;
      },
      get rKm() {
        return body.#readEcliptic(s, meanEclipticOfDate).r;
      },
      get ecliptic() {
        return body.#readEcliptic(s, meanEclipticOfDate);
      },
      get ra() {
        return body.#readRA(s, meanEquatorialOfDate);
      },
      get dec() {
        return body.#readDec(s, meanEquatorialOfDate);
      },
      get epsilon() {
        return meanObliquity(graphJd(body.time));
      },
    };
  }

  /**
   * Observe a body from this observer. Attaches `BodyClass` as the target and
   * returns `this` — the shared observer instance. Each call re-targets the
   * instance, so previously returned handles (e.g. from an earlier `observe`)
   * silently read the latest target. To observe several bodies, create a fresh
   * observer per body.
   */
  observe(BodyClass: new (time: Time) => Body) {
    const target = new BodyClass(this.time);
    if (this.algo) target.with(this.algo);
    this.target = target.source;
    // The observed distance magnitude comes from the *target's* formula unless
    // that formula is an origin marker (r=0), in which case it comes from the
    // observer's own formula. Convert using the config that produced the value.
    const observerUnit = this.algo?.[this.type]?.distanceUnit;
    const targetUnit = target.distanceUnit;
    this.#rUnit = target.#sourceOriginMarker
      ? observerUnit ?? targetUnit
      : targetUnit ?? observerUnit;
    return this.#refresh();
  }

  at(time: Time) {
    this.time = time;
    this.#dirty = true;
    return this;
  }

  #compute(): void {
    if (!this.#dirty && this.#apparentState && this.#geometricState) return;
    const rel = relative(this.source, this.target, this.resolver);
    const position: Position = { ...rel, origin: this.homeOrigin };
    this.#geometricState = coordinateState(
      position,
      this.type,
      feedJd(this.time, this.algo),
      feedScale(this.time, this.algo),
      { dynamic: true }
    );
    this.#apparentState = this.#toApparent(this.#geometricState);
    this.#dirty = false;
  }

  #toApparent(geo: CoordinateState<Vec3>): CoordinateState<Vec3> {
    const ctx = graphContext(this.time);
    const targetKey: CoordinateStateKey = {
      system: "ecliptic",
      reference: trueEclipticOfDate,
      center: this.homeOrigin,
    };
    const traced = this.#graph.trace(geo, targetKey, ctx);
    let state = geo;
    const baseSteps: ResolutionStep[] = [];
    for (const t of traced) {
      state = t.state;
      baseSteps.push({
        label: edgeLabel(t.edge),
        from: t.state.key,
        to: t.edge.to,
        corrections: t.edge.correction ? [t.edge.correction] : [],
      });
    }
    return applyCorrections(state, ctx, this.#correctionEdges(), baseSteps)
      .state;
  }

  #refresh(): this {
    this.#dirty = true;
    return this;
  }

  with(algo: AlgoConfig) {
    this.algo = algo as AlgorithmAdapter;
    this.#rUnit = algo[this.type]?.distanceUnit;
    const jd = feedJd(this.time, this.algo);
    this.resolver = buildResolver(algo, jd);
    const cfg = algo[this.type];
    if (cfg) {
      const raw = cfg.formula({ jd }) as AlgoOutput;
      this.#sourceOriginMarker = raw.r === 0;
      this.source = canonicalize(
        toPosition(raw, cfg),
        cfg,
        this.resolver.reference,
        this.resolver.system,
        jd
      );
    }
    return this.#refresh();
  }

  #correctionEdges(): TransformationEdge[] {
    return this.algo?.metadata?.transformations ?? [];
  }

  get info() {
    this.#compute();
    return {
      type: this.type,
      time: this.time.format(),
      jd: this.time.jd,
      origin: this.homeOrigin,
      source: this.source,
      target: this.target,
      algo: this.algo?.name ?? null,
      position: this.#apparentState?.position ?? null,
      geometric: this.#geometricState?.position ?? null,
    };
  }

  get explain(): Provenance | null {
    this.#compute();
    if (!this.#apparentState || !this.#geometricState) return null;
    const ctx = {
      ...graphContext(this.time),
      ...(this.algo ? { algorithm: this.algo.name } : {}),
    } as const;
    return this.#graph.explain(
      this.#geometricState,
      this.#apparentState.key,
      ctx
    ).provenance;
  }

  #readLambda(state: CoordinateState<Vec3>): DMS {
    const p = toSpherical(state.position);
    return new DMS(normalizeAngle(p.representation.lon, 0, 360));
  }

  #readBeta(state: CoordinateState<Vec3>): DMS {
    const p = toSpherical(state.position);
    return new DMS(normalizeAngle(p.representation.lat, -90, 90));
  }

  #readEcliptic(
    state: CoordinateState<Vec3>,
    reference: Reference
  ): GeometricView["ecliptic"] {
    let pos = state.position;
    if (
      !referencesEqual(pos.reference, reference) ||
      pos.system !== "ecliptic"
    ) {
      pos = toFrame(pos, "ecliptic", reference, graphJd(this.time));
    }
    const s = toSpherical(pos);
    return {
      l: new DMS(s.representation.lon),
      b: new DMS(s.representation.lat),
      r: toKm(s.representation.r, this.#rUnit),
      system: pos.system,
      reference: pos.reference,
    };
  }

  #equatorialOf(
    state: CoordinateState<Vec3>,
    reference: Reference
  ): CoordinateState<Vec3> {
    const targetKey: CoordinateStateKey = {
      system: "equatorial",
      reference,
      center: state.key.center,
    };
    const traced = this.#graph.trace(state, targetKey, graphContext(this.time));
    return traced.length ? traced.at(-1)!.state : state;
  }

  #readRA(state: CoordinateState<Vec3>, reference: Reference): DMS {
    const s = toSpherical(this.#equatorialOf(state, reference).position);
    return new DMS(normalizeAngle(s.representation.lon, 0, 360));
  }

  #readDec(state: CoordinateState<Vec3>, reference: Reference): DMS {
    const s = toSpherical(this.#equatorialOf(state, reference).position);
    return new DMS(normalizeAngle(s.representation.lat, -90, 90));
  }

  get ecliptic() {
    this.#compute();
    return this.#readEcliptic(this.#apparentState!, trueEclipticOfDate);
  }

  get lambda() {
    this.#compute();
    return this.#readLambda(this.#apparentState!);
  }

  get beta() {
    this.#compute();
    return this.#readBeta(this.#apparentState!);
  }

  get r() {
    return this.ecliptic.r;
  }

  get ra() {
    this.#compute();
    return this.#readRA(this.#apparentState!, trueEquatorialOfDate);
  }

  get dec() {
    this.#compute();
    return this.#readDec(this.#apparentState!, trueEquatorialOfDate);
  }

  get epsilon() {
    this.#compute();
    return trueObliquity(graphJd(this.time));
  }

  toEquatorial(): this {
    this.#compute();
    if (
      this.#geometricState &&
      this.#geometricState.key.system !== "equatorial"
    ) {
      const targetKey: CoordinateStateKey = {
        system: "equatorial",
        reference: meanEquatorialOfDate,
        center: this.homeOrigin,
      };
      const traced = this.#graph.trace(
        this.#geometricState,
        targetKey,
        graphContext(this.time)
      );
      this.#geometricState = traced.length
        ? traced.at(-1)!.state
        : this.rekeyTo(this.#geometricState, targetKey);
    }
    if (
      this.#apparentState &&
      this.#apparentState.key.system !== "equatorial"
    ) {
      const targetKey: CoordinateStateKey = {
        system: "equatorial",
        reference: trueEquatorialOfDate,
        center: this.homeOrigin,
      };
      const traced = this.#graph.trace(
        this.#apparentState,
        targetKey,
        graphContext(this.time)
      );
      this.#apparentState = traced.length
        ? traced.at(-1)!.state
        : this.rekeyTo(this.#apparentState, targetKey);
    }
    return this;
  }

  private rekeyTo(
    state: CoordinateState<Vec3>,
    key: CoordinateStateKey
  ): CoordinateState<Vec3> {
    return {
      ...state,
      key,
      position: {
        ...state.position,
        system: key.system,
        reference: key.reference,
        origin: key.center,
      },
    };
  }
}