import {
  eclipticToEquatorial,
  eclipticToXyz,
  xyzToEcliptic,
} from "../math/astrometry.js";
import { normalizeAngle } from "../math/unit.js";
import {
  type AlgoConfig,
  type ApparentCorrection,
  type BodyType,
  type HeliocentricEcliptic,
} from "../types.js";
import { DMS } from "./angle.js";
import { Representation } from "./representation.js";
import type { Time } from "./time.js";
import { Vec3 } from "./vec3.js";

export abstract class Body {
  abstract readonly type: BodyType;
  time: Time;
  sourceVec: Vec3 = new Vec3(0, 0, 0);
  targetVec: Vec3 = new Vec3(0, 0, 0);
  algo: AlgoConfig | null = null;
  epsilon: number = 23.5;
  appearance: "geometric" | "apparent" = "geometric";
  corrections: ApparentCorrection | null = null;

  constructor(time: Time) {
    this.time = time;
  }

  observe(BodyClass: new (time: Time) => Body) {
    const target = new BodyClass(this.time);
    console.log("target", target.sourceVec);
    this.targetVec = target.sourceVec;

    return this;
  }

  at(time: Time) {
    this.time = time;
    return this;
  }

  with(algo: AlgoConfig) {
    this.algo = algo;
    if (this.algo[this.type]) {
      if (this.algo[this.type]!.outputType === "ECLIPTIC") {
        const helioEcliptic = this.algo[this.type]!.formula({
          jd: this.time.jd,
        }) as HeliocentricEcliptic;
        const { l, b, r, epsilon } = helioEcliptic;
        this.epsilon = epsilon ?? this.epsilon;
        this.corrections = helioEcliptic.corrections ?? null;
        this.sourceVec = new Representation(
          new Vec3(l, b, r),
          "spherical"
        ).toCartesian().vec3;
      }
    }
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
      sourceVec: this.sourceVec,
      targetVec: this.targetVec,
      algo: this.algo?.name ?? null,
      appearance: this.appearance,
    };
  }

  get ecliptic() {
    const relativeVec = this.targetVec.sub(this.sourceVec);
    // console.log("relativeVec", relativeVec);
    const sphericalRepresentation = new Representation(
      relativeVec,
      "cartesian"
    ).toSpherical();
    // console.log("sphericalRepresentation", sphericalRepresentation.vec3);
    return {
      l: new DMS(sphericalRepresentation.vec3.x),
      b: new DMS(sphericalRepresentation.vec3.y),
      r: sphericalRepresentation.vec3.z,
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
