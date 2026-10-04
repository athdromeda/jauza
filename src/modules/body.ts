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
  ORIGIN_FOR,
} from "../types.js";
import { normalizeAngle } from "../math/unit.js";
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
  readonly r: number; // Geocentric distance, kilometres (canonical).
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

type StateResolver = (
  state: CoordinateState<Vec3>,
  system: System,
  reference: Reference
) => CoordinateState<Vec3>;

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
  /** Every native coordinate pair this body's own formula published. */
  #nativeSources: readonly Position[] = [];
  /** This body's own dedicated apparent position, when its config publishes one. */
  #apparentSource: Position | null = null;
  /** Every native coordinate pair this body's apparent formula published. */
  #apparentNativeSources: readonly Position[] = [];
  /** The observed target's native coordinate pairs, at the target's origin. */
  #targetNative: readonly Position[] = [];
  /** The observed target's dedicated apparent position, at the target's origin. */
  #targetApparent: Position | null = null;
  /** The observed target's apparent native pairs, at the target's origin. */
  #targetApparentNative: readonly Position[] = [];
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
   * observer per body. Positions are canonical km, so the observed distance
   * magnitude always comes from the (translated) target vector.
   */
  observe(BodyClass: new (time: Time) => Body) {
    const target = new BodyClass(this.time);
    if (this.algo) target.with(this.algo);
    this.#targetBody = target;
    this.target = target.source;
    this.#targetNative = target.#nativeSources;
    this.#targetApparent = target.#apparentSource;
    this.#targetApparentNative = target.#apparentNativeSources;
    this.#refreshNativeEligibility();
    return this.#refresh();
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
    const jd = feedJd(this.time, this.algo);
    const scale = feedScale(this.time, this.algo);

    const rel = relative(this.source, this.target, this.resolver);
    const position: Position = { ...rel, origin: this.homeOrigin };
    this.#geometricState = coordinateState(position, this.type, jd, scale, {
      dynamic: true,
    });

    if (this.#targetApparent) {
      // Dedicated apparent source: passed through frame edges only; its own
      // observational corrections are already included and must not be
      // re-applied by metadata transformation edges.
      const relApparent = relative(
        this.source,
        this.#targetApparent,
        this.resolver
      );
      const apparentPosition: Position = {
        ...relApparent,
        origin: this.homeOrigin,
      };
      const seed = coordinateState(apparentPosition, this.type, jd, scale, {
        dynamic: true,
      });
      this.#apparentState = this.#toApparent(seed, false);
    } else {
      this.#apparentState = this.#toApparent(this.#geometricState, true);
    }
    this.#dirty = false;
  }

  #toApparent(
    geo: CoordinateState<Vec3>,
    includeCorrections: boolean
  ): CoordinateState<Vec3> {
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
    if (!includeCorrections) return state;
    return applyCorrections(state, ctx, this.#correctionEdges(), baseSteps)
      .state;
  }

  #refresh(): this {
    this.#dirty = true;
    return this;
  }

  with(algo: AlgoConfig) {
    this.algo = algo as AlgorithmAdapter;
    const jd = feedJd(this.time, this.algo);
    this.resolver = buildResolver(algo, jd);
    const cfg = algo[this.type];
    this.#nativeSources = [];
    this.#apparentSource = null;
    this.#apparentNativeSources = [];
    if (cfg) {
      const raw = cfg.formula({ jd }) as AlgoOutput;
      const normalized = normalizeBodyOutput(raw, cfg);
      this.#nativeSources = normalized.native;
      this.source = canonicalize(
        normalized.primary,
        cfg,
        this.resolver.reference,
        this.resolver.system,
        jd
      );
      if (cfg.apparentFormula) {
        const rawApparent = cfg.apparentFormula({ jd }) as AlgoOutput;
        const normalizedApparent = normalizeBodyOutput(rawApparent, cfg);
        this.#apparentNativeSources = normalizedApparent.native;
        this.#apparentSource = canonicalize(
          normalizedApparent.primary,
          cfg,
          this.resolver.reference,
          this.resolver.system,
          jd
        );
      }
    }
    if (this.#targetBody) {
      this.#targetBody.with(algo);
      this.target = this.#targetBody.source;
      this.#targetNative = this.#targetBody.#nativeSources;
      this.#targetApparent = this.#targetBody.#apparentSource;
      this.#targetApparentNative = this.#targetBody.#apparentNativeSources;
      this.#refreshNativeEligibility();
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
    // An apparent (true-of-date) request on a dedicated-apparent adapter must
    // consult the apparent native table, never the geometric one.
    const apparentRequest =
      this.#targetApparent !== null && reference.orientation === "true";
    const native = apparentRequest
      ? this.#nativeTargetPosition(system, reference, this.#targetApparentNative)
      : this.#nativeTargetPosition(system, reference);
    const source = apparentRequest ? "apparent-native-table" : "native-table";
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
            metadata: { source },
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
   * target published one and no origin translation invalidated it. The
   * `sources` array defaults to the geometric native table; apparent accessors
   * pass the dedicated apparent native table.
   */
  #nativeTargetPosition(
    system: System,
    reference: Reference,
    sources: readonly Position[] = this.#targetNative
  ): Position | null {
    if (!this.#nativeTargetEligible) return null;
    return (
      sources.find(
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
  protected stateFor(
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
    return this.#frameState(fallback, system, reference);
  }

  /**
   * Resolve a state purely through the frame graph, never via native
   * shortcuts. Used for dedicated apparent states, whose native tables hold
   * geometric coordinates and must not shadow the apparent vector.
   */
  #frameState(
    fallback: CoordinateState<Vec3>,
    system: System,
    reference: Reference
  ): CoordinateState<Vec3> {
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

  /**
   * Resolve a state for a dedicated apparent read: the apparent native pair
   * wins when available, otherwise the dedicated apparent vector is transformed
   * through the frame graph. Geometric native coordinates are never consulted.
   */
  #apparentStateFor(
    fallback: CoordinateState<Vec3>,
    system: System,
    reference: Reference
  ): CoordinateState<Vec3> {
    const native = this.#nativeTargetPosition(
      system,
      reference,
      this.#targetApparentNative
    );
    if (native) {
      return coordinateState(
        native,
        this.type,
        feedJd(this.time, this.algo),
        feedScale(this.time, this.algo),
        { source: "apparent-native-table" }
      );
    }
    return this.#frameState(fallback, system, reference);
  }

  /**
   * Resolver for apparent accessors: dedicated apparent adapters read the
   * apparent native table and vector; everyone else keeps the legacy path.
   */
  #apparentResolver(): StateResolver {
    return this.#targetApparent
      ? (state, system, reference) =>
          this.#apparentStateFor(state, system, reference)
      : (state, system, reference) => this.stateFor(state, system, reference);
  }

  #readEcliptic(
    state: CoordinateState<Vec3>,
    reference: Reference,
    resolve: StateResolver = (state, system, reference) =>
      this.stateFor(state, system, reference)
  ): GeometricView["ecliptic"] {
    const resolved = resolve(state, "ecliptic", reference);
    const s = toSpherical(resolved.position);
    return {
      l: new DMS(normalizeAngle(s.representation.lon, 0, 360)),
      b: new DMS(normalizeAngle(s.representation.lat, -90, 90)),
      r: s.representation.r,
      system: "ecliptic",
      reference,
    };
  }

  #readRA(
    state: CoordinateState<Vec3>,
    reference: Reference,
    resolve: StateResolver = (state, system, reference) =>
      this.stateFor(state, system, reference)
  ): DMS {
    const resolved = resolve(state, "equatorial", reference);
    const s = toSpherical(resolved.position);
    return new DMS(normalizeAngle(s.representation.lon, 0, 360));
  }

  #readDec(
    state: CoordinateState<Vec3>,
    reference: Reference,
    resolve: StateResolver = (state, system, reference) =>
      this.stateFor(state, system, reference)
  ): DMS {
    const resolved = resolve(state, "equatorial", reference);
    const s = toSpherical(resolved.position);
    return new DMS(normalizeAngle(s.representation.lat, -90, 90));
  }

  get ecliptic() {
    this.#compute();
    return this.#readEcliptic(
      this.#apparentState!,
      trueEclipticOfDate,
      this.#apparentResolver()
    );
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
    return this.#readRA(
      this.#apparentState!,
      trueEquatorialOfDate,
      this.#apparentResolver()
    );
  }

  get dec() {
    this.#compute();
    return this.#readDec(
      this.#apparentState!,
      trueEquatorialOfDate,
      this.#apparentResolver()
    );
  }

  /** Whether the observed target published a dedicated apparent source. */
  protected get hasDedicatedApparent(): boolean {
    return this.#targetApparent !== null;
  }

  /**
   * Seed state for horizontal coordinates: the dedicated apparent state when
   * the target publishes one, otherwise the geometric state (legacy behavior).
   */
  protected get horizontalSeed(): CoordinateState<Vec3> {
    this.#compute();
    return this.#targetApparent ? this.#apparentState! : this.#geometricState!;
  }

  /**
   * Resolve a horizontal seed to true equatorial of date. Dedicated apparent
   * states use the apparent native table or apparent vector; legacy states keep
   * the geometric native preference.
   */
  protected resolveHorizontal(
    seed: CoordinateState<Vec3>
  ): CoordinateState<Vec3> {
    return this.hasDedicatedApparent
      ? this.#apparentStateFor(seed, "equatorial", trueEquatorialOfDate)
      : this.stateFor(seed, "equatorial", trueEquatorialOfDate);
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