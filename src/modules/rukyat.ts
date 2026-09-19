import { findConjunction, type ConjunctionResult } from "../utils/conjunction.js";
import { HijriCalendar } from "./calendar/hijri.js";
import type { AlgoConfig } from "../types.js";
import type { Earth } from "./earth.js";

type RukyatOptions = {};

type RukyatAlgos =
  | {
      sun: AlgoConfig;
      moon: AlgoConfig;
    }
  | AlgoConfig;

export class Rukyat {
  #anchor: number;
  #observer: Earth | undefined;
  #sunAlgo: AlgoConfig | undefined;
  #moonAlgo: AlgoConfig | undefined;
  #sunPositionFromEarth: Earth | undefined;
  #moonPositionFromEarth: Earth | undefined;

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

    if (this.#sunAlgo === this.#moonAlgo && this.#sunAlgo.conjunction) {
      return this.#sunAlgo.conjunction(this.#anchor, {
        sunAlgo: this.#sunAlgo,
        moonAlgo: this.#moonAlgo,
      });
    }

    return findConjunction(this.#sunAlgo, this.#moonAlgo, this.#anchor);
  }
}
