import { sin, cos } from "../math/trigonometry.js";
import type { TimeScale, TransformationContext } from "../contract.js";
import type { AlgoConfig } from "../types.js";
import { getDeltaT } from "../utils/time.js";
import {
  UTC_OFFSET_ROWS,
  UTC_START_JD,
  type UtcOffsetRow,
} from "../data/utc-offset.js";

export const TT: TimeScale = "TT";

export class UnsupportedTimeScaleError extends Error {
  constructor(scale: string) {
    super(`Unsupported time scale: "${scale}"`);
    this.name = "UnsupportedTimeScaleError";
  }
}

export class UTCPreEpochError extends Error {
  constructor(jd: number) {
    super(
      `UTC is not defined before 1960-01-01 (JD ${UTC_START_JD}); got JD ${jd}. ` +
        `Use UT1 or TT for earlier epochs.`
    );
    this.name = "UTCPreEpochError";
  }
}

const DAY_S = 86400;

const julianYear = (jd: number): number => 2000 + (jd - 2451545.0) / 365.25;

/**
 * ΔT = TT − UT1 in days, from the Espenak–Meeus polynomial. This is NOT
 * TT − UTC (which requires leap seconds + 32.184 s; see `ttMinusUtcDays`).
 */
export const deltaTDays = (jd: number): number => getDeltaT(julianYear(jd)) / DAY_S;

export const tdbCorrectionDays = (ttJd: number): number => {
  const g = 357.53 + 0.9856003 * (ttJd - 2451545.0);
  return (0.001658 * sin(g) + 0.000014 * sin(2 * g)) / DAY_S;
};

/** Gregorian calendar date -> JD at 0h UTC (proleptic Gregorian; only used for 1960+). */
function civilToJD(year: number, month: number, day: number): number {
  const M = month >= 3 ? month : month + 12;
  const Y = month >= 3 ? year : year - 1;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    1720994.5 +
    Math.floor(365.25 * Y) +
    Math.floor(30.6001 * (M + 1)) +
    B +
    day
  );
}

/** First JD each TAI−UTC row applies from (JD of `year-month-01` at 0h UTC). */
const ROW_KEYS: readonly { keyJd: number; row: UtcOffsetRow }[] =
  UTC_OFFSET_ROWS.map((row) => ({
    keyJd: civilToJD(row.year, row.month, 1),
    row,
  }));

/**
 * TAI − UTC (seconds) for a UTC JD, replicating ERFA `eraDat` / SOFA `iauDat`:
 * - jd < 1960-01-01 (JD 2436934.5): throws `UTCPreEpochError`.
 * - 1960–1971: piecewise linear drift (base offset + rate × (MJD − ref MJD)).
 * - 1972 onward: IERS leap-second table (integer seconds).
 */
export function taiMinusUtc(jd: number): number {
  if (jd < UTC_START_JD) throw new UTCPreEpochError(jd);
  const mjd = jd - 2400000.5;
  let idx = -1;
  for (let i = 0; i < ROW_KEYS.length; i++) {
    if (ROW_KEYS[i]!.keyJd <= jd) idx = i;
  }
  if (idx < 0) throw new UTCPreEpochError(jd);
  const entry = ROW_KEYS[idx]!;
  let da = entry.row.delat;
  if (entry.row.driftMjd > 0) {
    da += (mjd - entry.row.driftMjd) * entry.row.rate;
  }
  return da;
}

/** TT − UTC in days: (TAI − UTC) + 32.184 s, since TT = TAI + 32.184 s. */
export function ttMinusUtcDays(jd: number): number {
  return (taiMinusUtc(jd) + 32.184) / 86400;
}

const isValidTimescale = (s: unknown): s is TimeScale =>
  s === "UTC" || s === "TT" || s === "TDB";

export function scaleShift(from: TimeScale, to: TimeScale, jd: number): number {
  if (!isValidTimescale(from)) throw new UnsupportedTimeScaleError(String(from));
  if (!isValidTimescale(to)) throw new UnsupportedTimeScaleError(String(to));
  if (from === to) return 0;
  const utcTo = (target: TimeScale) =>
    target === "TT"
      ? ttMinusUtcDays(jd)
      : ttMinusUtcDays(jd) + tdbCorrectionDays(jd + ttMinusUtcDays(jd));
  if (from === "UTC") return utcTo(to);
  if (to === "UTC") return -utcTo(from);
  // TT <-> TDB only
  return from === "TT" ? tdbCorrectionDays(jd) : -tdbCorrectionDays(jd);
}

export function jdInScale(jd: number, from: TimeScale, to: TimeScale): number {
  return jd + scaleShift(from, to, jd);
}

// --- pure scale-resolution helpers (no state) ---

export type ScaleSource = {
  readonly jd: number;
  readonly scale: TimeScale;
};

type ScaleDeclaringAlgo = AlgoConfig & {
  readonly metadata?: { readonly timeScale?: TimeScale };
};

export const preferredScale = (
  algo: ScaleDeclaringAlgo | null | undefined,
  fallback: TimeScale
): TimeScale => algo?.metadata?.timeScale ?? fallback;

export const feedScale = (
  time: ScaleSource,
  algo: ScaleDeclaringAlgo | null
): TimeScale => preferredScale(algo, time.scale);

export const feedJd = (
  time: ScaleSource,
  algo: ScaleDeclaringAlgo | null
): number => jdInScale(time.jd, time.scale, feedScale(time, algo));

export const graphJd = (time: ScaleSource): number =>
  jdInScale(time.jd, time.scale, TT);

export const graphContext = (time: ScaleSource): TransformationContext => ({
  jd: graphJd(time),
  timeScale: TT,
});