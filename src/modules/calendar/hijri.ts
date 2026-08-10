import { Time } from "../time.js";
import { GregorianCalendar } from "./gregorian.js";

export const HIJRI_EPOCH = 1948438.5;
export const HIJRI_LEAP_YEARS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
export const ACCUMULATED_DAYS_IN_CYCLE = Array.from({ length: 30 }, (_, i) =>
  getAcculumatedDaysInRemainderYear(i)
);
export const DAYS_IN_CYCLE = 10631;

export class HijriCalendar extends Time {
  toJD() {
    const isNegativeYear = this.year < 0;
    const completedYear = isNegativeYear ? this.year * -1 + 1 : this.year - 1;
    const completedMonth = this.month - 1;
    const completedCycles = Math.floor(completedYear / 30);
    const remainder = completedYear % 30;

    const daysInCompletedCycles = completedCycles * DAYS_IN_CYCLE;
    const daysInRemainder = getAcculumatedDaysInRemainderYear(remainder);
    const daysInMonth = getAcculumatedDaysInMonth(completedMonth);

    return isNegativeYear
      ? HIJRI_EPOCH -
          (daysInCompletedCycles + daysInRemainder) +
          (daysInMonth + this.day)
      : HIJRI_EPOCH +
          (daysInCompletedCycles + daysInRemainder) +
          (daysInMonth + this.day);
  }

  fromJD(jd: number) {
    const delta = jd - HIJRI_EPOCH;
    const isNegative = delta < 0;
    const completedCycles = Math.floor(delta / DAYS_IN_CYCLE);
    const baseYear = completedCycles * 30;
    const { remainderYears, remainderDays } =
      getRemainderYearsFromAcculumatedDays(delta % DAYS_IN_CYCLE);

    const { months, remainingDays } =
      getMonthsFromAcculumatedDays(remainderDays);
    const result = baseYear + remainderYears;

    return {
      year: isNegative ? result * -1 - 1 : result,
      month: months + 1,
      day: remainingDays + 1,
      hour: 0,
      minute: 0,
      second: 0, // TODO: handle this time fraction
    };
  }

  get jd() {
    return this.toJD();
  }

  toGregorian() {
    return new GregorianCalendar(this.toJD());
  }
}

export function getAcculumatedDaysInRemainderYear(remainderYear: number) {
  const accumulatedLeapDays = HIJRI_LEAP_YEARS.filter(
    (year) => year <= remainderYear
  ).length;

  return remainderYear * 354 + accumulatedLeapDays;
}

export function getRemainderYearsFromAcculumatedDays(days: number) {
  const remainderYears = ACCUMULATED_DAYS_IN_CYCLE.filter(
    (accDays) => accDays <= days
  ).length;
  const remainderDays =
    days - (ACCUMULATED_DAYS_IN_CYCLE[remainderYears - 1] || 0);
  return { remainderYears, remainderDays };
}

export function getAcculumatedDaysInMonth(month: number) {
  return month * 29 + Math.ceil(month / 2);
}

export function getMonthsFromAcculumatedDays(days: number) {
  const months = Math.floor(days / 29);
  const remainingDays = days % 29;
  return { months, remainingDays };
}
