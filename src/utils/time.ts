import { decToHms } from "../math/unit.js";
import { JulianCalendar } from "../modules/calendar/julian.js";
import { type DateParams } from "../types.js";

export function resolveDate(...params: DateParams): {
  date: Date | JulianCalendar;
  calendar: "gregorian" | "julian";
} {
  const [
    dateOrYear,
    month = 1,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0,
  ] = params;
  if (dateOrYear instanceof Date) {
    return { date: dateOrYear, calendar: "gregorian" };
  }

  if (dateOrYear instanceof JulianCalendar) {
    return { date: dateOrYear, calendar: "julian" };
  }

  if (typeof dateOrYear === "number") {
    const date = new Date(
      dateOrYear,
      (month as number) - 1,
      day as number,
      hour as number,
      minute as number,
      second as number,
      ms as number
    );
    return { date, calendar: "gregorian" };
  }

  throw new Error("Invalid date parameters");
}

export function getJD(...params: DateParams) {
  const { date, calendar } = resolveDate(...params);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const millisecond = date.getMilliseconds();

  const M = month >= 3 ? month : month + 12;
  const Y = month >= 3 ? year : year - 1;

  const A = Math.floor(Y / 100);
  const B = calendar === "julian" ? 0 : 2 - A + Math.floor(A / 4);

  const JD =
    1720994.5 +
    Math.floor(365.25 * Y) +
    Math.floor(30.6001 * (M + 1)) +
    B +
    day +
    (hour + minute / 60 + second / 3600 + millisecond / 3600000) / 24;

  console.table({
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    M,
    Y,
    A,
    B,
    JD,
  });
  return JD;
}

export function jdToDate(jd: number) {
  const jd1 = jd + 0.5;
  const Z = Math.floor(jd1);
  const F = jd1 - Z;
  const A =
    Z < 2299161
      ? Z
      : Z +
        1 +
        Math.floor((Z - 1867216.25) / 36524.25) -
        Math.floor(Math.floor((Z - 1867216.25) / 36524.25) / 4);
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const hmsInDecimal = decToHms((day - Math.floor(day)) * 24);
  const hour = hmsInDecimal.hours;
  const minute = hmsInDecimal.minutes;
  const second = hmsInDecimal.seconds;
  const ms = hmsInDecimal.ms;
  return {
    year,
    month,
    day: Math.floor(day),
    hour: Math.floor(hour),
    minute,
    second,
    ms,
  };
}
