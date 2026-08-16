import {
  eclipticToEquatorial,
  eclipticToXyz,
  xyzToEcliptic,
} from "../math/astrometry.js";
import {
  type AlgoConfig,
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
        const { l, b, r } = this.algo[this.type]!.formula({
          jd: this.time.jd,
        }) as HeliocentricEcliptic;
        this.sourceVec = new Representation(
          new Vec3(l, b, r),
          "spherical"
        ).toCartesian().vec3;
      }
    }
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
    return this.ecliptic.l;
  }

  get beta() {
    return this.ecliptic.b;
  }

  get ra() {
    const ecliptic = this.ecliptic;
    const equatorial = eclipticToEquatorial(ecliptic);
    return equatorial.ra;
  }

  get dec() {
    const ecliptic = this.ecliptic;
    const equatorial = eclipticToEquatorial(ecliptic);
    return equatorial.dec;
  }
}
