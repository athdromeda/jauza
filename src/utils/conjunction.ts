import { normalizeAngle } from "../math/unit.js";
import { Time } from "../modules/time.js";
import { getDeltaT } from "./time.js";
import type { AlgoConfig, AlgoOutput, BodyConfig, BodyType } from "../types.js";
import { brent } from "../math/numerics.js";

function resolveConfig(algo: AlgoConfig, type: BodyType): BodyConfig {
  const cfg = algo[type];
  if (!cfg) {
    throw new Error(`Rukyat: algo is missing required body "${type}"`);
  }
  return cfg;
}

function longitudeOf(cfg: BodyConfig, jd: number): number {
  const out = cfg.formula({ jd }) as AlgoOutput;
  const lon = "lambda" in out ? out.lambda : out.l;
  return normalizeAngle(lon, 0, 360);
}

export function moonLongitude(moonAlgo: AlgoConfig, jd: number): number {
  return longitudeOf(resolveConfig(moonAlgo, "MOON"), jd);
}

export function sunLongitude(sunAlgo: AlgoConfig, jd: number): number {
  const sun = sunAlgo["SUN"];
  const earth = sunAlgo["EARTH"];
  const cfg = sun && sun.origin === "earth" ? sun : earth ?? sun;

  if (!cfg) {
    throw new Error("Rukyat: sun algo is missing both SUN and EARTH");
  }

  const out = cfg.formula({ jd }) as AlgoOutput;
  const lon = "lambda" in out ? out.lambda : out.l;

  return cfg.origin === "sun"
    ? normalizeAngle(lon + 180, 0, 360)
    : normalizeAngle(lon, 0, 360);
}

export type ConjunctionResult = {
  jde: number;
  ut: number;
  moonLon: number;
  sunLon: number;
};

function resultAt(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  jd: number
): ConjunctionResult {
  const moonLon = moonLongitude(moonAlgo, jd);
  const sunLon = sunLongitude(sunAlgo, jd);
  const year = new Time(jd).year;

  const ut = jd;
  const jde = jd + getDeltaT(year) / 86400;
  return { jde, ut, moonLon, sunLon };
}

function rawDifference(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  jd: number
): number {
  return moonLongitude(moonAlgo, jd) - sunLongitude(sunAlgo, jd);
}

function localDifference(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  refCont: number,
  jd: number
): number {
  const d = rawDifference(sunAlgo, moonAlgo, jd);
  return d - 360 * Math.round((d - refCont) / 360);
}

type Bracket = { a: number; b: number; contA: number };

const CONJUNCTION_DRIFT_DAYS = 5;

export function findConjunction(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  date: number
): ConjunctionResult {
  const refN = normalizeAngle(
    rawDifference(sunAlgo, moonAlgo, date),
    -180,
    180
  );

  const grid: { jd: number; cont: number }[] = [{ jd: date, cont: refN }];
  let last = refN;
  for (let jd = date + 1; jd <= date + CONJUNCTION_DRIFT_DAYS; jd += 1) {
    const c = localDifference(sunAlgo, moonAlgo, last, jd);
    grid.push({ jd, cont: c });
    last = c;
  }
  last = refN;
  for (let jd = date - 1; jd >= date - CONJUNCTION_DRIFT_DAYS; jd -= 1) {
    const c = localDifference(sunAlgo, moonAlgo, last, jd);
    grid.unshift({ jd, cont: c });
    last = c;
  }

  for (const p of grid) {
    if (Math.abs(p.cont) < 1e-9) return resultAt(sunAlgo, moonAlgo, p.jd);
  }

  const brackets: Bracket[] = [];
  for (let i = 1; i < grid.length; i++) {
    const prev = grid[i - 1];
    const cur = grid[i];
    if (prev && cur && prev.cont * cur.cont < 0) {
      brackets.push({ a: prev.jd, b: cur.jd, contA: prev.cont });
    }
  }

  if (brackets.length === 0) {
    throw new Error("Rukyat: no conjunction found within search window");
  }

  let best = 0;
  let bestDist = Infinity;
  for (const { a, b, contA } of brackets) {
    const local = (jd: number) => localDifference(sunAlgo, moonAlgo, contA, jd);
    const cand = brent(local, a, b);
    const dist = Math.abs(cand - date);
    if (dist < bestDist) {
      best = cand;
      bestDist = dist;
    }
  }

  return resultAt(sunAlgo, moonAlgo, best);
}
