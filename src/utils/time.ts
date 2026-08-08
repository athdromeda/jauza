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
