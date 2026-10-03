import type { DMS } from "./modules/angle.js";
import type { Origin, Position, Reference, System } from "./modules/position.js";
import type { TimeScale } from "./contract.js";
import type { ConjunctionResult, RukyatData } from "./utils/conjunction.js";
import type { Earth } from "./modules/earth.js";

export type Vec3 = [number, number, number];
export type Vec3Tuple = Vec3;
export type Algo = (time: Date) => Vec3;

export type TimeOptions = {
  timezone?: number;
  calendar?: CalendarSystem;
  scale?: TimeScale;
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

export type EotFn = (jd: number) => number;

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

export type BodyConfig = {
  outputType: OutputType;
  origin: Origin;
  system: System;
  reference: Reference;
  formula: (input: AlgoInput) => AlgoOutput;
  toCanonical?: (pos: Position, jd: number) => Position;
  /** Units of the `r` (distance) component returned by `formula`. */
  distanceUnit: DistanceUnit;
};

export type OutputType = "ECLIPTIC" | "EQUATORIAL";

export type DistanceUnit = "km" | "au" | "earth-radii";

export type AlgoInput = {
  jd: number;
};

export type AlgoOutput = GeocentricEcliptic | HeliocentricEcliptic; //to be added more later

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
