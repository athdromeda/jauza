import { eclipticToEquatorial } from "../math/astrometry.js";
import { normalizeAngle } from "../math/unit.js";
import {
  type AlgoConfig,
  type ApparentCorrection,
  type BodyType,
  type HeliocentricEcliptic,
  ORIGIN_FOR,
} from "../types.js";
import { DMS } from "./angle.js";
import type { Origin, Position } from "./position.js";
import { eclipticOfDate } from "./position.js";
import type { OriginResolver } from "./transform.js";
import { buildResolver, createResolver, relative, toPosition, toSpherical } from "./transform.js";
import type { Time } from "./time.js";
import { Vec3 } from "./vec3.js";

export abstract class Body {
  readonly type: BodyType;
  time: Time;
  source: Position;
  target: Position;
  resolver: OriginResolver;
  algo: AlgoConfig | null = null;
  epsilon: number = 23.5;
  appearance: "geometric" | "apparent" = "geometric";
  corrections: ApparentCorrection | null = null;

  constructor(time: Time, type: BodyType) {
    this.type = type;
    this.time = time;
    this.source = this.homePosition;
    this.target = this.homePosition;
    this.resolver = createResolver({});
  }

  get homeOrigin(): Origin {
    return ORIGIN_FOR[this.type];
  }

  get homePosition(): Position {
    return {
      representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
      origin: this.homeOrigin,
      frame: eclipticOfDate,
    };
  }

  observe(BodyClass: new (time: Time) => Body) {
    const target = new BodyClass(this.time);
    if (this.algo) target.with(this.algo);
    this.target = target.source;
    return this;
  }

  at(time: Time) {
    this.time = time;
    return this;
  }

  with(algo: AlgoConfig) {
    this.algo = algo;
    const cfg = algo[this.type];
    if (cfg) {
      const raw = cfg.formula({ jd: this.time.jd }) as HeliocentricEcliptic;
      this.source = toPosition(raw, cfg);
      this.epsilon = raw.epsilon ?? this.epsilon;
      this.corrections = raw.corrections ?? null;
    }
    this.resolver = buildResolver(algo, this.time.jd);
    return this;
  }

  apparent() {
    this.appearance = "apparent";
    return this;
  }

  get info() {
    return {
      type: this.type,
      time: this.time.format(),
      jd: this.time.jd,
      origin: this.homeOrigin,
      source: this.source,
      target: this.target,
      algo: this.algo?.name ?? null,
      appearance: this.appearance,
    };
  }

  get ecliptic() {
    const pos = toSpherical(relative(this.source, this.target, this.resolver));
    return {
      l: new DMS(pos.representation.lon),
      b: new DMS(pos.representation.lat),
      r: pos.representation.r,
    };
  }

  get lambda() {
    if (this.appearance === "apparent") {
      const aberrationLon = this.corrections?.aberration?.lon ?? 0;
      const nutationLon = this.corrections?.nutation?.lon ?? 0;
      return new DMS(
        normalizeAngle(this.ecliptic.l.decimal + aberrationLon + nutationLon)
      );
    }
    return this.ecliptic.l;
  }

  get beta() {
    if (this.appearance === "apparent") {
      const aberrationLat = this.corrections?.aberration?.lat ?? 0;
      return new DMS(normalizeAngle(this.ecliptic.b.decimal + aberrationLat));
    }
    return this.ecliptic.b;
  }

  get r() {
    return this.ecliptic.r;
  }

  get ra() {
    const ecliptic = this.ecliptic;
    const equatorial = eclipticToEquatorial(ecliptic, this.epsilon);
    return equatorial.ra;
  }

  get dec() {
    const ecliptic = this.ecliptic;
    const equatorial = eclipticToEquatorial(ecliptic, this.epsilon);
    return equatorial.dec;
  }
}