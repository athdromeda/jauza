export type YallopResult =
  | "ZONE_A"
  | "ZONE_B"
  | "ZONE_C"
  | "ZONE_D"
  | "ZONE_E"
  | false;

export type OdehResult =
  | "VISIBLE_NAKED_EYE"
  | "VISIBLE_OPTICAL"
  | "VISIBLE_OPTICAL_ONLY"
  | false;

export function yallop(arcv: number, wPrime: number): YallopResult {
  const q =
    (arcv -
      (11.8371 -
        6.3226 * wPrime +
        0.7319 * Math.pow(wPrime, 2) -
        0.1018 * Math.pow(wPrime, 3))) /
    10;

  if (q > 0.216) return "ZONE_A";
  if (q > -0.014) return "ZONE_B";
  if (q > -0.16) return "ZONE_C";
  if (q > -0.232) return "ZONE_D";
  if (q > -0.293) return "ZONE_E";
  return false;
}

export function odeh(arcv: number, w: number): OdehResult {
  const v =
    arcv -
    (-0.1018 * Math.pow(w, 3) + 0.7319 * Math.pow(w, 2) - 6.3226 * w + 7.1651);

  if (v >= 5.65) return "VISIBLE_NAKED_EYE";
  if (v >= 2.0) return "VISIBLE_OPTICAL";
  if (v >= -0.96) return "VISIBLE_OPTICAL_ONLY";
  return false;
}

export function newMabims(alt: number, arcl: number): boolean {
  return alt >= 3.0 && arcl >= 6.4;
}

export function diyanet(alt: number, arcl: number): boolean {
  return alt >= 5.0 && arcl >= 8.0;
}

export function danjon(arcl: number, limit: number = 7.0): boolean {
  return arcl >= limit;
}
