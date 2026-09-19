import {
  findConjunction,
  computeHilalDetails,
  type ConjunctionResult,
  type RukyatData,
} from "../utils/conjunction.js";
import { HijriCalendar } from "./calendar/hijri.js";
import type { AlgoConfig } from "../types.js";
import type { Earth } from "./earth.js";
import {
  yallop,
  odeh,
  newMabims,
  diyanet,
  danjon,
  type YallopResult,
  type OdehResult,
} from "../utils/visibility.js";

type RukyatOptions = {};

type RukyatAlgos =
  | {
      sun: AlgoConfig;
      moon: AlgoConfig;
    }
  | AlgoConfig;

export type VisibilityParams = {
  arcv?: number;
  w?: number;
  wPrime?: number;
  danjonLimit?: number;
};

export type VisibilityResult = {
  odeh: OdehResult;
  newMabims: boolean;
  yallop: YallopResult;
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

    if (this.#sunAlgo === this.#moonAlgo && this.#sunAlgo.conjunction) {
      baseResult = this.#sunAlgo.conjunction(this.#anchor, {
        sunAlgo: this.#sunAlgo,
        moonAlgo: this.#moonAlgo,
      });
    } else {
      baseResult = findConjunction(this.#sunAlgo, this.#moonAlgo, this.#anchor);
    }

    if (this.#observer) {
      const hilal = computeHilalDetails(
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

  visibility(params?: VisibilityParams): VisibilityResult {
    const res = this.conjunction();
    if (!res.hilal) {
      throw new Error("Rukyat: call at(observer) before isVisible()");
    }

    const alt = res.hilal.moonAlt.decimal;
    const arcl = res.hilal.elongation.decimal;

    const arcv = params?.arcv ?? alt;
    const rad = (arcl * Math.PI) / 180;
    const defaultW = 15.5 * (1 - Math.cos(rad));
    const w = params?.w ?? defaultW;
    const wPrime = params?.wPrime ?? w;

    return {
      odeh: odeh(arcv, w),
      newMabims: newMabims(alt, arcl),
      yallop: yallop(arcv, wPrime),
      danjon: danjon(arcl, params?.danjonLimit),
      diyanet: diyanet(alt, arcl),
    };
  }
}
