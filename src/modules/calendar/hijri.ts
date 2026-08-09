import { Time } from "../time.js";

export const HIJRI_EPOCH = 1948438.5;
export const HIJRI_LEAP_YEARS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

export class HijriCalendar extends Time {
  toJD() {
    const isNegativeYear = this.year < 0;
    const completedYear = isNegativeYear ? this.year * -1 + 1 : this.year - 1;
    const completedCycles = Math.floor(completedYear / 30);
    const remainder = completedYear % 30;

    const daysInCompletedCycles = completedCycles * 10631;
    const daysInRemainder = getAcculumatedDaysInRemainderYear(remainder);
    const daysInMonth = getAcculumatedDaysInMonth(this.month);

    console.table({
      year: this.year,
      month: this.month,
      day: this.day,
      completedCycles,
      remainder,
      daysInCompletedCycles,
      daysInRemainder,
      daysInMonth,
      date: this.day,
    });

    return (
      HIJRI_EPOCH +
      (daysInCompletedCycles + daysInRemainder + daysInMonth + this.day) *
        (isNegativeYear ? -1 : 1)
    );
  }

  get jd() {
    return this.toJD();
  }
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
