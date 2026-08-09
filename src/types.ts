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
