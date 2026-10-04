import {
  coordinateState,
  keyOf,
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
  type System,
} from "./position.js";
import type { OriginResolver } from "./transform.js";
import {
  buildResolver,
  canonicalize,
  createResolver,
  normalizeBodyOutput,
  referencesEqual,
  relative,
  toCartesian,
  toSpherical,
} from "./transform.js";
import { meanObliquity, trueObliquity } from "../transformations/obliquity.js";
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
  /** Every native coordinate pair this body's own formula published. */
  #nativeSources: readonly Position[] = [];
  /** The observed target's native coordinate pairs, at the target's origin. */
  #targetNative: readonly Position[] = [];
  /** Whether the observation is an identity translation of the target, so its
   * geocentric native coordinates remain authoritative. */
  #nativeTargetEligible = false;
  /** The live target body from the last `observe`, so a later `with` can still
   * configure it (the `.observe(X).with(algo)` call order). */
  #targetBody: Body | null = null;

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
    this.#targetBody = target;
    this.target = target.source;
    this.#targetNative = target.#nativeSources;
    this.#refreshNativeEligibility();
    this.#resolveDistanceUnit(target);
    return this.#refresh();
  }

  /**
   * The observed distance magnitude comes from the *target's* formula unless
   * that formula is an origin marker (r=0), in which case it comes from the
   * observer's own formula. Convert using the config that produced the value.
   */
  #resolveDistanceUnit(target: Body): void {
    const observerUnit = this.algo?.[this.type]?.distanceUnit;
    const targetUnit = target.distanceUnit;
    this.#rUnit = target.#sourceOriginMarker
      ? observerUnit ?? targetUnit
      : targetUnit ?? observerUnit;
  }

  at(time: Time) {
    this.time = time;
    this.#dirty = true;
    this.#targetNative = [];
    this.#nativeTargetEligible = false;
    this.#targetBody?.at(time);
    return this;
  }

  /** Native shortcuts are valid only for an identity translation to the home
   * origin; any observer offset or foreign origin invalidates them. */
  #refreshNativeEligibility(): void {
    const observer = toCartesian(this.source).representation.vec3;
    this.#nativeTargetEligible =
      this.source.origin === this.homeOrigin &&
      observer.x === 0 &&
      observer.y === 0 &&
      observer.z === 0;
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
    this.#nativeSources = [];
    this.#sourceOriginMarker = false;
    if (cfg) {
      const raw = cfg.formula({ jd }) as AlgoOutput;
      const normalized = normalizeBodyOutput(raw, cfg);
      this.#nativeSources = normalized.native;
      this.#sourceOriginMarker = raw.r === 0;
      this.source = canonicalize(
        normalized.primary,
        cfg,
        this.resolver.reference,
        this.resolver.system,
        jd
      );
    }
    if (this.#targetBody) {
      this.#targetBody.with(algo);
      this.target = this.#targetBody.source;
      this.#targetNative = this.#targetBody.#nativeSources;
      this.#refreshNativeEligibility();
      this.#resolveDistanceUnit(this.#targetBody);
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

  /**
   * Provenance for a specific accessor target, distinguishing an exact native
   * table read from a graph-derived transformation.
   */
  explainCoordinates(system: System, reference: Reference): Provenance {
    this.#compute();
    const native = this.#nativeTargetPosition(system, reference);
    const ctx = {
      ...graphContext(this.time),
      ...(this.algo ? { algorithm: this.algo.name } : {}),
    } as const;

    if (native) {
      const key = keyOf(native);
      return {
        algorithm: ctx.algorithm ?? "",
        jd: ctx.jd,
        timeScale: ctx.timeScale,
        steps: [
          {
            label: `${this.algo?.name ?? "algorithm"} native coordinates`,
            from: key,
            to: key,
            corrections: [],
            metadata: { source: "native-table" },
          },
        ],
      };
    }

    const seed =
      reference.orientation === "true"
        ? this.#apparentState!
        : this.#geometricState!;
    const target: CoordinateStateKey = {
      system,
      reference,
      center: seed.key.center,
    };
    return this.#graph.explain(seed, target, ctx).provenance;
  }

  #readLambda(state: CoordinateState<Vec3>): DMS {
    const p = toSpherical(state.position);
    return new DMS(normalizeAngle(p.representation.lon, 0, 360));
  }

  #readBeta(state: CoordinateState<Vec3>): DMS {
    const p = toSpherical(state.position);
    return new DMS(normalizeAngle(p.representation.lat, -90, 90));
  }

  /**
   * Exact native coordinate pair for the requested frame, when the observed
   * target published one and no origin translation invalidated it.
   */
  #nativeTargetPosition(
    system: System,
    reference: Reference
  ): Position | null {
    if (!this.#nativeTargetEligible) return null;
    return (
      this.#targetNative.find(
        (position) =>
          position.origin === this.homeOrigin &&
          position.system === system &&
          referencesEqual(position.reference, reference)
      ) ?? null
    );
  }

  /**
   * Resolve a target state: eligible native coordinates win, otherwise derive
   * through the frame graph from the given fallback state.
   */
  #stateFor(
    fallback: CoordinateState<Vec3>,
    system: System,
    reference: Reference
  ): CoordinateState<Vec3> {
    const native = this.#nativeTargetPosition(system, reference);
    if (native) {
      return coordinateState(
        native,
        this.type,
        feedJd(this.time, this.algo),
        feedScale(this.time, this.algo),
        { source: "native-table" }
      );
    }
    const targetKey: CoordinateStateKey = {
      system,
      reference,
      center: fallback.key.center,
    };
    const traced = this.#graph.trace(
      fallback,
      targetKey,
      graphContext(this.time)
    );
    return traced.length ? traced.at(-1)!.state : fallback;
  }

  #readEcliptic(
    state: CoordinateState<Vec3>,
    reference: Reference
  ): GeometricView["ecliptic"] {
    const resolved = this.#stateFor(state, "ecliptic", reference);
    const s = toSpherical(resolved.position);
    return {
      l: new DMS(normalizeAngle(s.representation.lon, 0, 360)),
      b: new DMS(normalizeAngle(s.representation.lat, -90, 90)),
      r: toKm(s.representation.r, this.#rUnit),
      system: "ecliptic",
      reference,
    };
  }

  #readRA(state: CoordinateState<Vec3>, reference: Reference): DMS {
    const s = toSpherical(this.#stateFor(state, "equatorial", reference).position);
    return new DMS(normalizeAngle(s.representation.lon, 0, 360));
  }

  #readDec(state: CoordinateState<Vec3>, reference: Reference): DMS {
    const s = toSpherical(this.#stateFor(state, "equatorial", reference).position);
    return new DMS(normalizeAngle(s.representation.lat, -90, 90));
  }

  get ecliptic() {
    this.#compute();
    return this.#readEcliptic(this.#apparentState!, trueEclipticOfDate);
  }

  get lambda() {
    return this.ecliptic.l;
  }

  get beta() {
    return this.ecliptic.b;
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