import { resolveDate } from "../../utils/time.js";
import { Time } from "../time.js";
import type { DateParams } from "../../types.js";

export class Hijri extends Time {}

export const HIJRI_EPOCH = 1948438.5;
export const HIJRI_LEAP_YEARS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

export function hijriToJD(...dateParams: DateParams) {
  const { date } = resolveDate(...dateParams);
  const completedYear = date.getUTCFullYear() - 1;
  const completedCycles = Math.floor(completedYear / 30);
  const remainder = completedYear % 30;

  const daysInCompletedCycles = completedCycles * 10631;
  const daysInRemainder = getAcculumatedDaysInRemainderYear(remainder);
  const daysInMonth = getAcculumatedDaysInMonth(date.getUTCMonth() + 1); // TODO: need to refactor later; using getUTCTime for hijri is ambiguous

  console.table({
    completedCycles,
    remainder,
    daysInCompletedCycles,
    daysInRemainder,
    daysInMonth,
    date: date.getUTCDate() + 1, // TODO: need to refactor later; using getUTCTime for hijri is ambiguous
  });

  return (
    HIJRI_EPOCH +
    daysInCompletedCycles +
    daysInRemainder +
    daysInMonth +
    date.getUTCDate() +
    1
  );
}

export function getAcculumatedDaysInRemainderYear(remainderYear: number) {
  const accumulatedLeapDays = HIJRI_LEAP_YEARS.filter(
    (year) => year <= remainderYear
  ).length;

  return remainderYear * 354 + accumulatedLeapDays;
}

export function getAcculumatedDaysInMonth(month: number) {
  return month * 29 + Math.floor(month / 2);
}
