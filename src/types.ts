import type { DMS } from "./modules/angle.js";

export type Vec3 = [number, number, number];
export type Algo = (time: Date) => Vec3;

export type TimeOptions = {
  timezone?: number;
  calendar?: CalendarSystem;
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
}

export type AlgoConfig = {
  name: string;
  bodies: BodyType[];
} & Partial<Record<BodyType, BodyConfig>>;

export type BodyType = "SUN" | "MOON" | "EARTH" | "BODY";

export type BodyConfig = {
  outputType: OutputType;
  formula: (input: AlgoInput) => AlgoOutput;
};

export type OutputType = "ECLIPTIC" | "EQUATORIAL";

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
