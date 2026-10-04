export type YallopZone = "A" | "B" | "C" | "D" | "E" | "F";
export type OdehZone = "A" | "B" | "C" | "D";

export type YallopInput = {
  arcvDeg: number;
  crescentWidthArcmin: number;
};
export type OdehInput = YallopInput;

export type YallopAssessment = { q: number; zone: YallopZone };
export type OdehAssessment = { v: number; zone: OdehZone };

const assertFiniteInput = ({
  arcvDeg,
  crescentWidthArcmin,
}: YallopInput) => {
  if (!Number.isFinite(arcvDeg) || !Number.isFinite(crescentWidthArcmin)) {
    throw new RangeError("Visibility inputs must be finite");
  }
  if (crescentWidthArcmin < 0) {
    throw new RangeError("Crescent width must be non-negative");
  }
};

const yallopZoneFor = (q: number): YallopZone => {
  if (q > 0.216) return "A";
  if (q > -0.014) return "B";
  if (q > -0.16) return "C";
  if (q > -0.232) return "D";
  if (q > -0.293) return "E";
  return "F";
};

export function yallop({
  arcvDeg,
  crescentWidthArcmin: w,
}: YallopInput): YallopAssessment {
  assertFiniteInput({ arcvDeg, crescentWidthArcmin: w });
  const q =
    (arcvDeg - (11.8371 - 6.3226 * w + 0.7319 * w ** 2 - 0.1018 * w ** 3)) /
    10;
  return { q, zone: yallopZoneFor(q) };
}

const odehZoneFor = (v: number): OdehZone => {
  if (v >= 5.65) return "A";
  if (v >= 2) return "B";
  if (v >= -0.96) return "C";
  return "D";
};

export function odeh({
  arcvDeg,
  crescentWidthArcmin: w,
}: OdehInput): OdehAssessment {
  assertFiniteInput({ arcvDeg, crescentWidthArcmin: w });
  const v =
    arcvDeg - (-0.1018 * w ** 3 + 0.7319 * w ** 2 - 6.3226 * w + 7.1651);
  return { v, zone: odehZoneFor(v) };
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