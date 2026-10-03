import { normalizeAngle } from "../math/unit.js";
import { Time } from "../modules/time.js";
import { Earth } from "../modules/earth.js";
import { Sun } from "../modules/sun.js";
import { Moon } from "../modules/moon.js";
import { DMS, HMS } from "../modules/angle.js";
import { sin, cos, acos } from "../math/trigonometry.js";
import { getDeltaT } from "./time.js";
import type { AlgoConfig, AlgoOutput, BodyConfig, BodyType } from "../types.js";
import type { TimeScale } from "../contract.js";
import { jdInScale, preferredScale } from "../frames/time-scale.js";
import { brent } from "../math/numerics.js";
import { semiDiameter } from "./apparent.js";

function resolveConfig(algo: AlgoConfig, type: BodyType): BodyConfig {
  const cfg = algo[type];
  if (!cfg) {
    throw new Error(`Rukyat: algo is missing required body "${type}"`);
  }
  return cfg;
}

const algoScale = (algo: AlgoConfig): TimeScale => preferredScale(algo, "UTC");

function longitudeOf(cfg: BodyConfig, jd: number, scale: TimeScale): number {
  const callJd = jdInScale(jd, "UTC", scale);
  const out = cfg.formula({ jd: callJd }) as AlgoOutput;
  const lon = "lambda" in out ? out.lambda : out.l;
  return normalizeAngle(lon, 0, 360);
}

export function moonLongitude(moonAlgo: AlgoConfig, jd: number): number {
  return longitudeOf(resolveConfig(moonAlgo, "MOON"), jd, algoScale(moonAlgo));
}

export function sunLongitude(sunAlgo: AlgoConfig, jd: number): number {
  const sun = sunAlgo["SUN"];
  const earth = sunAlgo["EARTH"];
  const cfg = sun && sun.origin === "earth" ? sun : earth ?? sun;

  if (!cfg) {
    throw new Error("Rukyat: sun algo is missing both SUN and EARTH");
  }

  const out = cfg.formula({
    jd: jdInScale(jd, "UTC", algoScale(sunAlgo)),
  }) as AlgoOutput;
  const lon = "lambda" in out ? out.lambda : out.l;

  return cfg.origin === "sun"
    ? normalizeAngle(lon + 180, 0, 360)
    : normalizeAngle(lon, 0, 360);
}

export type CrescentCondition = "Tilted North" | "Tilted South" | "Flat";

export function getCrescentCondition(
  moonAzimuth: number,
  sunAzimuth: number
): CrescentCondition {
  const diff = moonAzimuth - sunAzimuth;
  if (Math.abs(diff) < 1e-4) {
    return "Flat";
  }
  // The crescent tilts AWAY from the sun: moon south of the sun → the horns
  // lean north ("miring ke utara"), moon north → lean south.
  return diff < 0 ? "Tilted North" : "Tilted South";
}

export type RukyatData = {
  sunset: Time;
  sunAzimuth: DMS;
  moonAlt: DMS;
  moonAzimuth: DMS;
  moonPosition: DMS;
  elongation: DMS;
  crescentCondition: CrescentCondition;
  lag: HMS;
  moonset: Time;
  moonsetAzimuth: DMS;
  illumination: number;
  age: HMS;
  /** mar'i upper-limb altitude (moonAlt + SD☾); populated by custom hilal fns. */
  moonAltUpper?: DMS;
  /** geometric center altitude (pre-parallax); populated by custom hilal fns. */
  moonAltGeometric?: DMS;
  /** parallax correction P = HP·cos(h); populated by custom hilal fns. */
  moonAltParallax?: DMS;
  /** refraction term; populated by custom hilal fns. */
  moonAltRefraction?: DMS;
  /** dip term (0.0293·√h); populated by custom hilal fns. */
  moonAltDip?: DMS;
};

export type RukyatHilalData = RukyatData;

export type ConjunctionResult = {
  jde: number;
  ut: number;
  moonLon: number;
  sunLon: number;
  hilal?: RukyatData;
};

// Book's mar'i horizon: h = -(SD + 34′30″ + Dip), Dip = 0.0293·√h (h in metres).
const HORIZON_REFRACTION_ALT = 34.5 / 60;
const DIP_COEFFICIENT = 0.0293;

function horizonTargetAltitude(sd: number, elevation: number): number {
  return -(sd + HORIZON_REFRACTION_ALT + DIP_COEFFICIENT * Math.sqrt(elevation));
}

function findSunset(
  sunAlgo: AlgoConfig,
  observer: Earth,
  conjunctionUt: number
): number {
  const tz = Math.round(observer.lng / 15);
  const conjunctionTime = new Time(conjunctionUt, { timezone: tz });

  const approxSunsetTime = new Time(
    conjunctionTime.year,
    conjunctionTime.month,
    conjunctionTime.day,
    18,
    0,
    0,
    { timezone: tz }
  );

  const startJd = approxSunsetTime.jd - 4 / 24;
  const endJd = approxSunsetTime.jd + 4 / 24;

  const getSunAlt = (jd: number) => {
    const obs = new Earth(observer.lat, observer.lng, observer.h)
      .at(new Time(jd, { timezone: tz }))
      .observe(Sun)
      .with(sunAlgo);
    const sd = semiDiameter("SUN", obs.geometric().rKm, "km");
    return obs.alt - horizonTargetAltitude(sd, observer.h);
  };

  return brent(getSunAlt, startJd, endJd);
}

function findMoonset(
  moonAlgo: AlgoConfig,
  observer: Earth,
  sunsetJd: number
): number {
  const tz = Math.round(observer.lng / 15);

  const startJd = sunsetJd - 4 / 24;
  const endJd = sunsetJd + 4 / 24;

  const getMoonAlt = (jd: number) => {
    const obs = new Earth(observer.lat, observer.lng, observer.h)
      .at(new Time(jd, { timezone: tz }))
      .observe(Moon)
      .with(moonAlgo);
    const sd = semiDiameter("MOON", obs.geometric().rKm, "km");
    return obs.alt - horizonTargetAltitude(sd, observer.h);
  };

  return brent(getMoonAlt, startJd, endJd);
}

export function computeHilalDetails(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  observer: Earth,
  conjunctionRes: ConjunctionResult
): RukyatData {
  const sunsetJd = findSunset(sunAlgo, observer, conjunctionRes.ut);
  const sunsetTime = new Time(sunsetJd);

  const sunObsSunset = new Earth(observer.lat, observer.lng, observer.h)
    .at(sunsetTime)
    .observe(Sun)
    .with(sunAlgo);
  const sunAz = sunObsSunset.az;

  const moonObsSunset = new Earth(observer.lat, observer.lng, observer.h)
    .at(sunsetTime)
    .observe(Moon)
    .with(moonAlgo);
  const moonAlt = moonObsSunset.alt;
  const moonAz = moonObsSunset.az;

  const moonPosDeg = Math.abs(moonAz - sunAz);

  const moonEcl = moonObsSunset.geometric();
  const sunEcl = sunObsSunset.geometric();
  const moonLambda = moonEcl.lambda.decimal;
  const moonBeta = moonEcl.beta.decimal;
  const sunLambda = sunEcl.lambda.decimal;
  const sunBeta = sunEcl.beta.decimal;

  const cosE =
    sin(moonBeta) * sin(sunBeta) +
    cos(moonBeta) * cos(sunBeta) * cos(moonLambda - sunLambda);
  const elongationDeg = acos(Math.min(1, Math.max(-1, cosE)));

  const crescentCondition = getCrescentCondition(moonAz, sunAz);

  const moonsetJd = findMoonset(moonAlgo, observer, sunsetJd);
  const moonsetTime = new Time(moonsetJd);

  const moonObsMoonset = new Earth(observer.lat, observer.lng, observer.h)
    .at(moonsetTime)
    .observe(Moon)
    .with(moonAlgo);
  const moonsetAz = moonObsMoonset.az;

  const lagHours = (moonsetJd - sunsetJd) * 24;
  const illumFraction = (1 - cos(elongationDeg)) / 2;
  const illumPercent = illumFraction * 100;
  const ageHours = (sunsetJd - conjunctionRes.ut) * 24;

  return {
    sunset: sunsetTime,
    sunAzimuth: new DMS(sunAz),
    moonAlt: new DMS(moonAlt),
    moonAzimuth: new DMS(moonAz),
    moonPosition: new DMS(moonPosDeg),
    elongation: new DMS(elongationDeg),
    crescentCondition,
    lag: new HMS(lagHours),
    moonset: moonsetTime,
    moonsetAzimuth: new DMS(moonsetAz),
    illumination: illumPercent,
    age: new HMS(ageHours),
  };
}

function resultAt(
  sunAlgo: AlgoConfig,
  moonAlgo: AlgoConfig,
  jd: number
): ConjunctionResult {
  const moonLon = moonLongitude(moonAlgo, jd);
  const sunLon = sunLongitude(sunAlgo, jd);
  const year = new Time(jd).year;

  const ut = jd;
  // Keep ΔT→TT for the reported epoch; neglect the ~1.7ms TDB↔TT offset here
  // (it is far below the ~5-day search window and the root-finder tolerance).
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
