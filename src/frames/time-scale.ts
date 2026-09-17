import { sin, cos } from "../math/trigonometry.js";
import type { TimeScale, TransformationContext } from "../contract.js";
import type { AlgoConfig } from "../types.js";
import { getDeltaT } from "../utils/time.js";

export const TT: TimeScale = "TT";

export class UnsupportedTimeScaleError extends Error {
  constructor(scale: string) {
    super(`Unsupported time scale: "${scale}"`);
    this.name = "UnsupportedTimeScaleError";
  }
}

const DAY_S = 86400;

const julianYear = (jd: number): number => 2000 + (jd - 2451545.0) / 365.25;

export const deltaTDays = (jd: number): number => getDeltaT(julianYear(jd)) / DAY_S;

export const tdbCorrectionDays = (ttJd: number): number => {
  const g = 357.53 + 0.9856003 * (ttJd - 2451545.0);
  return (0.001658 * sin(g) + 0.000014 * sin(2 * g)) / DAY_S;
};

const isValidTimescale = (s: unknown): s is TimeScale =>
  s === "UTC" || s === "TT" || s === "TDB";

export function scaleShift(from: TimeScale, to: TimeScale, jd: number): number {
  if (!isValidTimescale(from)) throw new UnsupportedTimeScaleError(String(from));
  if (!isValidTimescale(to)) throw new UnsupportedTimeScaleError(String(to));
  if (from === to) return 0;
  const utcTo = (target: TimeScale) =>
    target === "TT"
      ? deltaTDays(jd)
      : deltaTDays(jd) + tdbCorrectionDays(jd + deltaTDays(jd));
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