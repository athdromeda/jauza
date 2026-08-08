import type { JulianCalendar } from "./modules/calendar/julian.js";

export type Vec3 = [number, number, number];
export type Algo = (time: Date) => Vec3;
export type DateParams =
  | [date: Date]
  | [julianDate: JulianCalendar]
  | [year: number]
  | [year: number, month: number]
  | [year: number, month: number, day: number]
  | [year: number, month: number, day: number, hour: number]
  | [year: number, month: number, day: number, hour: number, minute: number]
  | [
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ]
  | [
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
      ms: number
    ];
