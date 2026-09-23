import { getHA } from "../math/astrometry.js";
import { acot, cos, sin, tan } from "../math/trigonometry.js";
import type { AlgoConfig } from "../types.js";
import { Earth } from "./earth.js";
import { Sun } from "./sun.js";
import { Time } from "./time.js";

type SalatOptions = {
  timezone?: number;
  ishaAlt?: number;
  fajrAlt?: number;
  asrFactor?: 1 | 2;
  dhuhaAlt?: number;
  maghribAlt?: number;
  sunriseAlt?: number;
};

export class Salat {
  #time: Time;
  #options: SalatOptions;
  #observer: Earth = new Earth(0, 0, 0);
  sunAlgo: AlgoConfig | undefined;
  sunPosition: Earth | undefined;

  constructor(time: Time, options: SalatOptions) {
    this.#time = time;
    this.#options = options;
  }

  at(earth: Earth) {
    this.#observer = earth;
    return this;
  }

  with(algo: AlgoConfig) {
    this.sunAlgo = algo;

    const sun = this.#observer.at(this.#time).observe(Sun).with(this.sunAlgo);
    this.sunPosition = sun;
    return this;
  }

  eot() {
    const custom = this.sunAlgo?.eot;
    if (custom) {
      return custom(this.#time.jd) / 60;
    }

    const timezone =
      this.#options.timezone ?? Math.round(this.#observer.lng / 15);
    const local = this.#time.jd - timezone / 24;
    const T = (local - 2451545) / 36525;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T * T;
    const eot =
      -(1789 + 237 * T) * sin(L0) -
      (7146 - 62 * T) * cos(L0) +
      (9934 - 14 * T) * sin(2 * L0) -
      (29 + 5 * T) * cos(2 * L0) +
      (74 + 10 * T) * sin(3 * L0) +
      (320 - 4 * T) * cos(3 * L0) -
      212 * sin(4 * L0);
    // console.table({ jd: this.#time.jd, T, L0, eot });

    return eot / 1000;
  }

  istiwa() {
    const timezone =
      this.#options.timezone ?? Math.round(this.#observer.lng / 15);
    return 12 + timezone - this.#observer.lng / 15 - this.eot() / 60;
  }

  dhuhr() {
    return this.istiwa();
  }

  asr(shadowFactor?: 1 | 2) {
    if (!this.sunPosition) {
      throw new Error("Sun position not calculated");
    }
    const factor = shadowFactor ?? this.#options.asrFactor ?? 1;
    const alt = acot(
      factor + tan(Math.abs(this.#observer.lat - this.sunPosition.dec.decimal))
    );
    return this.istiwa() + this.ha(alt) / 15;
  }

  maghrib(alt?: number) {
    const altitude =
      alt ??
      this.#options.maghribAlt ??
      -0.833 - 0.0347 * Math.sqrt(this.#observer.h);
    return this.istiwa() + this.ha(altitude) / 15;
  }

  isha(alt?: number) {
    return this.istiwa() + this.ha(alt ?? this.#options.ishaAlt ?? -18) / 15;
  }

  fajr(alt?: number) {
    return this.istiwa() - this.ha(alt ?? this.#options.fajrAlt ?? -20) / 15;
  }

  imsak() {
    return this.fajr() - 10 / 60;
  }

  sunrise(alt?: number) {
    const altitude =
      alt ??
      this.#options.sunriseAlt ??
      -0.833 - 0.0347 * Math.sqrt(this.#observer.h);
    return this.istiwa() - this.ha(altitude) / 15;
  }

  dhuha(alt?: number) {
    return this.istiwa() - this.ha(alt ?? this.#options.dhuhaAlt ?? 0.833) / 15;
  }

  ha(alt: number) {
    if (!this.sunAlgo) {
      throw new Error("Sun algo not set");
    }
    if (!this.sunPosition) {
      throw new Error("Sun position not calculated");
    }
    const ha = getHA(alt, this.#observer.lat, this.sunPosition!.dec.decimal);
    return ha;
  }

  asTime(hour: number) {
    return new Time(this.#time.year, this.#time.month, this.#time.day, hour);
  }

  info() {
    return {
      istiwa: this.istiwa(),
      dhuhr: this.dhuhr(),
      asr: this.asr(),
      maghrib: this.maghrib(),
      isha: this.isha(),
      fajr: this.fajr(),
      imsak: this.imsak(),
      sunrise: this.sunrise(),
      dhuha: this.dhuha(),
    };
  }
}
