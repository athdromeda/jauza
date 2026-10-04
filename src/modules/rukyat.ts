import {
  findConjunction,
  computeHilalDetails,
  type ConjunctionResult,
  type RukyatData,
} from "../utils/conjunction.js";
import { HijriCalendar } from "./calendar/hijri.js";
import type { AlgoConfig } from "../types.js";
import type { Earth } from "./earth.js";
import { Time } from "./time.js";
import {
  bestTime,
  computeVisibilityGeometry,
  type VisibilityGeometry,
} from "../utils/visibility-geometry.js";
import {
  yallop,
  odeh,
  newMabims,
  diyanet,
  danjon,
  type YallopAssessment,
  type OdehAssessment,
} from "../utils/visibility.js";

type RukyatOptions = {};

type RukyatAlgos =
  | {
      sun: AlgoConfig;
      moon: AlgoConfig;
    }
  | AlgoConfig;

export type VisibilityOptions = {
  danjonLimit?: number;
};

export type VisibilityResult = {
  sunset: Time;
  moonset: Time;
  geometry: VisibilityGeometry;
  yallop: YallopAssessment;
  odeh: OdehAssessment;
  newMabims: boolean;
  danjon: boolean;
  diyanet: boolean;
};

export class Rukyat {
  #anchor: number;
  #observer: Earth | undefined;
  #sunAlgo: AlgoConfig | undefined;
  #moonAlgo: AlgoConfig | undefined;

  constructor(hijriYear: number, hijriMonth: number, options?: RukyatOptions) {
    this.#anchor = new HijriCalendar(hijriYear, hijriMonth, 1).jd;
  }

  at(earth: Earth): this {
    this.#observer = earth;
    return this;
  }

  with(algos: RukyatAlgos): this {
    if ("sun" in algos && "moon" in algos) {
      this.#sunAlgo = algos.sun;
      this.#moonAlgo = algos.moon;
    } else {
      this.#sunAlgo = algos;
      this.#moonAlgo = algos;
    }
    return this;
  }

  conjunction(): ConjunctionResult {
    if (!this.#sunAlgo || !this.#moonAlgo) {
      throw new Error("Rukyat: call with(algo) before conjunction()");
    }

    let baseResult: ConjunctionResult;

    const custom = this.#sunAlgo.conjunction;
    if (custom && custom === this.#moonAlgo.conjunction) {
      baseResult = custom(this.#anchor, {
        sunAlgo: this.#sunAlgo,
        moonAlgo: this.#moonAlgo,
      });
    } else {
      baseResult = findConjunction(this.#sunAlgo, this.#moonAlgo, this.#anchor);
    }

    if (this.#observer) {
      const hilalFn = this.#sunAlgo.hilal;
      const hilal =
        hilalFn && hilalFn === this.#moonAlgo.hilal
          ? hilalFn({
              observer: this.#observer,
              sunAlgo: this.#sunAlgo,
              moonAlgo: this.#moonAlgo,
              conjunction: baseResult,
            })
          : computeHilalDetails(
              this.#sunAlgo,
              this.#moonAlgo,
              this.#observer,
              baseResult
            );
      return {
        ...baseResult,
        hilal,
      };
    }

    return baseResult;
  }

  format(): string {
    const res = this.conjunction();
    if (!res.hilal) {
      throw new Error("Rukyat: call at(observer) before format()");
    }
    return this.#formatHilal(res.hilal);
  }

  #formatHilal(hilal: RukyatData): string {
    return [
      `Sunset                              =  ${hilal.sunset.format(
        "HH:mm:ss UTC"
      )}`,
      `Sun Azimuth                         =  ${hilal.sunAzimuth.format()}`,
      `Moon Center Altitude                =  ${hilal.moonAlt.format()}`,
      `Moon Azimuth                        =  ${hilal.moonAzimuth.format()}`,
      `Moon Relative Position              =  ${hilal.moonPosition.format()}`,
      `Geocentric Elongation               =  ${hilal.elongation.format()}`,
      `Crescent Condition                  =  ${hilal.crescentCondition}`,
      `Lag Duration                        =  ${hilal.lag.format()}`,
      `Moonset                             =  ${hilal.moonset.format(
        "HH:mm:ss UTC"
      )}`,
      `Moonset Azimuth                     =  ${hilal.moonsetAzimuth.format()}`,
      `Moon Illumination                   =  ${hilal.illumination.toFixed(
        2
      )}%`,
      `Moon Age                            =  ${hilal.age.format()}`,
    ].join("\n");
  }

  visibility(options?: VisibilityOptions): VisibilityResult {
    if (!this.#sunAlgo || !this.#moonAlgo) {
      throw new Error("Rukyat: call with(algo) before visibility()");
    }
    if (!this.#observer) {
      throw new Error("Rukyat: call at(observer) before visibility()");
    }

    const result = this.conjunction();
    if (!result.hilal) {
      throw new Error("Rukyat: hilal data is required for visibility()");
    }

    const time = bestTime(result.hilal.sunset, result.hilal.moonset);
    const geometry = computeVisibilityGeometry({
      time,
      observer: this.#observer,
      sunAlgo: this.#sunAlgo,
      moonAlgo: this.#moonAlgo,
    });

    const sunsetAlt = result.hilal.moonAlt.decimal;
    const sunsetArcl = result.hilal.elongation.decimal;

    return {
      sunset: result.hilal.sunset,
      moonset: result.hilal.moonset,
      geometry,
      yallop: yallop({
        arcvDeg: geometry.geocentric.arcvDeg,
        crescentWidthArcmin: geometry.yallopWidthArcmin,
      }),
      odeh: odeh({
        arcvDeg: geometry.topocentric.arcvDeg,
        crescentWidthArcmin: geometry.odehWidthArcmin,
      }),
      newMabims: newMabims(sunsetAlt, sunsetArcl),
      danjon: danjon(sunsetArcl, options?.danjonLimit),
      diyanet: diyanet(sunsetAlt, sunsetArcl),
    };
  }
}