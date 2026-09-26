import { KAABA_LNG, KAABA_LAT } from "../data/qibla.js";
import { brent } from "../math/numerics.js";
import { normalizeAngle } from "../math/unit.js";
import type { AlgoConfig } from "../types.js";
import { getQibla } from "../utils/qibla.js";
import { Earth } from "./earth.js";
import { Sun } from "./sun.js";
import { Time } from "./time.js";

const SOLAR_NOON_UTC = (12 - KAABA_LNG / 15) / 24;

const wrap = (x: number, half: number) =>
  ((((x + half) % (2 * half)) + 2 * half) % (2 * half)) - half;

export class RashdQibla {
  #mode: "GLOBAL" | "LOCAL";
  #year: number | undefined;
  #anchor: Time | undefined;
  #sunAlgo: AlgoConfig | undefined;
  #observer: Earth | undefined;

  constructor();
  constructor(year: number);
  constructor(time: Time);
  constructor(arg?: number | Time) {
    if (arg instanceof Time) {
      this.#mode = "LOCAL";
      this.#anchor = arg;
    } else {
      this.#mode = "GLOBAL";
      this.#year = arg ?? Time.now().year;
    }
  }

  with(algo: AlgoConfig): Time[] | this {
    this.#sunAlgo = algo;
    if (this.#mode === "GLOBAL") {
      return this.#global();
    }
    return this;
  }

  at(earth: Earth): Time[] {
    if (this.#mode !== "LOCAL") {
      throw new Error(
        "RashdQibla: at(earth) is only for local rashd qibla (need to construct with a Time)"
      );
    }
    if (!this.#sunAlgo) {
      throw new Error("RashdQibla: call with(algo) before at(earth)");
    }
    this.#observer = earth;
    return this.#local();
  }

  #sun(jd: number, earth?: Earth) {
    const obs = new Earth(earth?.lat ?? 0, earth?.lng ?? 0, earth?.h ?? 0).at(
      new Time(jd)
    );
    return obs.observe(Sun).with(this.#sunAlgo!);
  }

  #decAt(jd: number): number {
    return this.#sun(jd).dec.decimal;
  }

  #raHours(jd: number): number {
    return this.#sun(jd).ra.decimal / 15;
  }

  #subSolarLng(jd: number): number {
    const gstDeg = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
    return this.#raHours(jd) * 15 - gstDeg;
  }

  #transitForK(k: number, guessJd: number): number {
    const target = KAABA_LNG + 360 * k;
    const guess = guessJd + (this.#subSolarLng(guessJd) - target) / 360;
    const f = (jd: number) => this.#subSolarLng(jd) - target;
    return brent(f, guess - 0.5, guess + 0.5);
  }

  #rashdNear(dayJd: number): number {
    const k0 = Math.round(this.#subSolarLng(dayJd) / 360);
    let best = k0;
    let bestDiff = Infinity;
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      const diff = Math.abs(
        this.#decAt(this.#transitForK(k, dayJd)) - KAABA_LAT
      );
      if (diff < bestDiff) {
        best = k;
        bestDiff = diff;
      }
    }
    return this.#transitForK(best, dayJd);
  }

  #global(): Time[] {
    const year = this.#year!;
    const jan1 = new Time(year, 1, 1).jd;

    const brackets: [number, number][] = [];
    for (const center of [147, 197]) {
      const window = 15;
      const scanStart = jan1 + center - window;
      let prev = this.#decAt(scanStart + SOLAR_NOON_UTC) - KAABA_LAT;
      let prevDay = scanStart;
      for (let d = 1; d <= 30; d++) {
        const cur = this.#decAt(scanStart + d + SOLAR_NOON_UTC) - KAABA_LAT;
        if (prev * cur < 0) {
          brackets.push([prevDay, scanStart + d]);
        }
        prev = cur;
        prevDay = scanStart + d;
      }
    }

    return brackets.map(([a, b]) => new Time(this.#rashdNear((a + b) / 2)));
  }

  #local(): Time[] {
    const earth = this.#observer!;
    const anchor = this.#anchor!;
    const tz = Math.round(earth.lng / 15);

    const qibla = getQibla(earth.lat, earth.lng);
    const targetAz = normalizeAngle(qibla + 180, 0, 360);

    const dayStart = new Time(anchor.year, anchor.month, anchor.day, {
      timezone: tz,
    }).jd;

    const f = (jd: number) => wrap(this.#sun(jd, earth).az - targetAz, 180);

    const roots: number[] = [];
    const step = 1 / 48;
    let prevJd = dayStart;
    let prev = f(prevJd);
    for (let i = 1; i <= 48; i++) {
      const jd = dayStart + step * i;
      const cur = f(jd);
      if (prev * cur < 0) {
        try {
          const root = brent(f, prevJd, jd);
          if (Math.abs(f(root)) < 1e-3) roots.push(root);
        } catch {
          // skip non-bracketed intervals (wrap discontinuity)
        }
      }
      prev = cur;
      prevJd = jd;
    }

    return roots.map((jd) => new Time(jd, { timezone: tz }));
  }
}
