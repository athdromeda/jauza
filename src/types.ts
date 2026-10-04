import type { DMS } from "./modules/angle.js";
import type { Origin, Position, Reference, System } from "./modules/position.js";
import type { TimeScale } from "./contract.js";
import type { ConjunctionResult, RukyatData } from "./utils/conjunction.js";
import type { Earth } from "./modules/earth.js";

export type Vec3 = [number, number, number];
export type Vec3Tuple = Vec3;
export type Algo = (time: Date) => Vec3;

export enum CalendarMode {
  Hybrid = "hybrid", // Julian before 1582, Gregorian after
  ProlepticGregorian = "proleptic-gregorian", // Gregorian rule applied uniformly to all years.
}

export type TimeOptions = {
  timezone?: number;
  calendar?: CalendarSystem;
  scale?: TimeScale;
  mode?: CalendarMode;
};
export type TimeArgs =
  | [year: number]
  | [date: Date]
  | [year: number, month: number, options?: TimeOptions]
  | [year: number, month: number, day: number, options?: TimeOptions]
  | [
      year: number,
      month: number,
      day: number,
      hour: number,
      options?: TimeOptions
    ]
  | [
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      options?: TimeOptions
    ]
  | [
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
      options?: TimeOptions
    ];

export type TimeZone =
  | { type: "offset"; offset: number }
  | { type: "name"; name: string };

export enum CalendarSystem {
  Gregorian = "GREGORIAN",
  Julian = "JULIAN",
  Hijri = "HIJRI",
}

export interface TimeFormatOptions {
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  hijriMonths?: string[];
}

export type ConjunctionFn = (
  anchorJd: number,
  options?: {
    sunAlgo?: AlgoConfig;
    moonAlgo?: AlgoConfig;
    [key: string]: unknown;
  }
) => ConjunctionResult;

export type EotFn = (jd: number) => number; // output in second

export type HilalFn = (opts: {
  observer: Earth;
  sunAlgo?: AlgoConfig;
  moonAlgo?: AlgoConfig;
  conjunction: ConjunctionResult;
}) => RukyatData;

export type AlgoConfig = {
  name: string;
  bodies: BodyType[];
  conjunction?: ConjunctionFn;
  hilal?: HilalFn;
  eot?: EotFn;
} & Partial<Record<BodyType, BodyConfig>>;

export type BodyType = "SUN" | "MOON" | "EARTH" | "BODY";

export const ORIGIN_FOR: Record<BodyType, Origin> = {
  SUN: "sun",
  MOON: "moon",
  EARTH: "earth",
  BODY: "barycenter",
};

type BodyConfigBase = {
  origin: Origin;
  /** Native units of the `r` component returned by `formula`; Positions produced
   * from it are canonicalized to km. */
  distanceUnit: DistanceUnit;
  toCanonical?: (pos: Position, jd: number) => Position;
};

/** Legacy single-coordinate body config. Kept for backward compatibility. */
export type LegacyBodyConfig = BodyConfigBase & {
  outputType: "ECLIPTIC" | "EQUATORIAL";
  system: System;
  reference: Reference;
  formula: (input: AlgoInput) => LegacyAlgoOutput;
};

/** A coordinate pair published by an algorithm in one explicit frame. */
export type NativeCoordinates = {
  system: System;
  reference: Reference;
  longitude: number;
  latitude: number;
};

/** The `(system, reference)` identity of a native coordinate pair. */
export type CoordinateKey = {
  system: System;
  reference: Reference;
};

/**
 * Multi-coordinate output: one primary state (used for vector arithmetic and
 * origin translation) plus every coordinate pair the source publishes.
 */
export type MultiCoordinateOutput = {
  r: number;
  primary: CoordinateKey;
  coordinates: readonly [NativeCoordinates, ...NativeCoordinates[]];
};

export type MultiCoordinateBodyConfig = BodyConfigBase & {
  outputType: "MULTI_SPHERICAL";
  formula: (input: AlgoInput) => MultiCoordinateOutput;
};

export type BodyConfig = LegacyBodyConfig | MultiCoordinateBodyConfig;

export type OutputType = BodyConfig["outputType"];

export type DistanceUnit = "km" | "au" | "earth-radii";

export type AlgoInput = {
  jd: number;
};

export type LegacyAlgoOutput = GeocentricEcliptic | HeliocentricEcliptic;

export type AlgoOutput = LegacyAlgoOutput | MultiCoordinateOutput;

export type GeocentricEcliptic = {
  lambda: number;
  beta: number;
  r: number;
};

export type HeliocentricEcliptic = {
  l: number;
  b: number;
  r: number;
};

export interface EquatorialValues {
  ra: DMS;
  dec: DMS;
}

export interface EclipticValues {
  l: DMS;
  b: DMS;
  r: number;
}

export interface HorizontalValues {
  az: DMS;
  alt: DMS;
}

export type CivilTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};
