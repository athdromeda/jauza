import { Time } from "../time.js";
import { GregorianCalendar } from "./gregorian.js";
import { HMS } from "../angle.js";
import { decToHms } from "../../math/unit.js";
import { CalendarSystem } from "../../types.js";
export { HIJRI_MONTHS } from "../../data/calendar.js";

export const HIJRI_EPOCH = 1948438.5;
export const HIJRI_LEAP_YEARS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
export const ACCUMULATED_DAYS_IN_CYCLE = Array.from({ length: 30 }, (_, i) =>
  getAcculumatedDaysInRemainderYear(i)
);
export const DAYS_IN_CYCLE = 10631;

export class HijriCalendar extends Time {
  protected resolveCalendar() {
    return CalendarSystem.Hijri;
  }

  protected civilToJDUt(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
  ): number {
    const isNegativeYear = year < 0;
    const completedYear = isNegativeYear ? year * -1 + 1 : year - 1;
    const completedMonth = month - 1;
    const completedCycles = Math.floor(completedYear / 30);
    const remainder = completedYear % 30;

    const daysInCompletedCycles = completedCycles * DAYS_IN_CYCLE;
    const daysInRemainder = getAcculumatedDaysInRemainderYear(remainder);
    const daysInMonth = getAcculumatedDaysInMonth(completedMonth);
    const timeFraction = (hour + minute / 60 + second / 3600) / 24;

    return isNegativeYear
      ? HIJRI_EPOCH -
          (daysInCompletedCycles + daysInRemainder) +
          (daysInMonth + day) +
          timeFraction
      : HIJRI_EPOCH +
          (daysInCompletedCycles + daysInRemainder) +
          (daysInMonth + day) +
          timeFraction;
  }

  fromJD(jd: number) {
    const totalDays = jd - HIJRI_EPOCH;
    const H = Math.floor(totalDays);
    const { hours, minutes, seconds } = decToHms(
      Math.round((totalDays - H) * 24 * 1e6) / 1e6
    );
    const hms = new HMS(hours, minutes, seconds);

    if (H >= 0) {
      const completedCycles = Math.floor(H / DAYS_IN_CYCLE);
      const baseYear = completedCycles * 30;
      const rem = H - completedCycles * DAYS_IN_CYCLE;

      let r = 0;
      while (r < 29 && ACCUMULATED_DAYS_IN_CYCLE[r + 1]! < rem) r++;

      const year = baseYear + r + 1;
      const daysIntoYear = rem - ACCUMULATED_DAYS_IN_CYCLE[r]!;

      let monthIdx = 0;
      while (
        monthIdx < 11 &&
        getAcculumatedDaysInMonth(monthIdx + 1) <= daysIntoYear - 1
      ) {
        monthIdx++;
      }
      const day = daysIntoYear - getAcculumatedDaysInMonth(monthIdx);

      return {
        year,
        month: monthIdx + 1,
        day,
        hour: hms.hour,
        minute: hms.min,
        second: hms.sec,
      };
    }

    const absH = -H;
    const ccMin = Math.floor((absH + 1) / DAYS_IN_CYCLE);
    const ccMax = Math.floor((absH + 355) / DAYS_IN_CYCLE);

    for (let cc = ccMin; cc <= ccMax; cc++) {
      for (let r = 0; r < 30; r++) {
        const M = H + cc * DAYS_IN_CYCLE + ACCUMULATED_DAYS_IN_CYCLE[r]!;
        if (M < 1 || M > 355) continue;

        let monthIdx = 0;
        while (
          monthIdx < 11 &&
          getAcculumatedDaysInMonth(monthIdx + 1) <= M - 1
        ) {
          monthIdx++;
        }
        const day = M - getAcculumatedDaysInMonth(monthIdx);
        if (day < 1 || day > 30) continue;

        const completedYear = cc * 30 + r;
        const year = -(completedYear - 1);

        return {
          year,
          month: monthIdx + 1,
          day,
          hour: hms.hour,
          minute: hms.min,
          second: hms.sec,
        };
      }
    }

    return {
      year: 0,
      month: 1,
      day: 1,
      hour: hms.hour,
      minute: hms.min,
      second: hms.sec,
    };
  }

  toGregorian() {
    return new GregorianCalendar(this.jd);
  }
}

export function getAcculumatedDaysInRemainderYear(remainderYear: number) {
  const accumulatedLeapDays = HIJRI_LEAP_YEARS.filter(
    (year) => year <= remainderYear
  ).length;

  return remainderYear * 354 + accumulatedLeapDays;
}

export function getAcculumatedDaysInMonth(month: number) {
  return month * 29 + Math.ceil(month / 2);
}
