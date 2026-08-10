import { decToHms } from "../math/unit.js";
import {
  CalendarSystem,
  type TimeFormatOptions,
  type TimeOptions,
} from "../types.js";

export class Time {
  #year: number;
  #month: number;
  #day: number;
  #hour: number;
  #minute: number;
  #second: number;
  #timezone: number;
  #calendar: CalendarSystem;

  constructor(jd: number);
  constructor(jd: number, options?: TimeOptions);
  constructor(date: Date);
  constructor(year: number, month: number, day: number, options?: TimeOptions);
  constructor(
    year: number,
    month: number,
    day: number,
    hour: number,
    options?: TimeOptions
  );
  constructor(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    options?: TimeOptions
  );
  constructor(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    options?: TimeOptions
  );

  constructor(
    jdOrDate: number | Date,
    month?: number | TimeOptions,
    dayOrOptions?: number | TimeOptions,
    hour?: number | TimeOptions,
    minute?: number | TimeOptions,
    second?: number | TimeOptions,
    options?: TimeOptions
  ) {
    if (typeof jdOrDate === "number") {
      if (
        arguments.length === 1 ||
        (arguments.length === 2 && typeof month === "object")
      ) {
        const { year, month, day, hour, minute, second } =
          this.fromJD(jdOrDate); // TODO: handle this for Hijri
        this.#year = year;
        this.#month = month;
        this.#day = day;
        this.#hour = hour;
        this.#minute = minute;
        this.#second = second;
        this.#timezone = 0;
        this.#calendar = CalendarSystem.Gregorian;
        return;
      }

      this.#year = jdOrDate;
      this.#month = (month as number) || 1;
      this.#day = (dayOrOptions as number) || 1;
      this.#hour = (hour as number) || 0;
      this.#minute = (minute as number) || 0;
      this.#second = (second as number) || 0;
      this.#timezone = (options as TimeOptions)?.timezone || 0;
      this.#calendar = this.resolveCalendar(options);
    } else {
      this.#year = jdOrDate.getUTCFullYear();
      this.#month = jdOrDate.getUTCMonth() + 1;
      this.#day = jdOrDate.getUTCDate();
      this.#hour = jdOrDate.getUTCHours();
      this.#minute = jdOrDate.getUTCMinutes();
      this.#second = jdOrDate.getUTCSeconds();
      this.#timezone = (options as TimeOptions)?.timezone || 0;
      this.#calendar = this.resolveCalendar(options);
    }
  }

  get info() {
    return {
      year: this.#year,
      month: this.#month,
      day: this.#day,
      hour: this.#hour,
      minute: this.#minute,
      second: this.#second,
      timezone: this.#timezone,
      calendar: this.#calendar,
    };
  }

  get year() {
    return this.#year;
  }

  get month() {
    return this.#month;
  }

  get day() {
    return this.#day;
  }

  get hour() {
    return this.#hour;
  }

  get minute() {
    return this.#minute;
  }

  get second() {
    return this.#second;
  }

  get timezone() {
    return this.#timezone;
  }

  get calendar() {
    return this.#calendar;
  }

  toJD() {
    const M = this.#month >= 3 ? this.#month : this.#month + 12;
    const Y = this.#month >= 3 ? this.#year : this.#year - 1;

    const A = Math.floor(Y / 100);
    const B =
      this.#calendar === CalendarSystem.Julian ? 0 : 2 - A + Math.floor(A / 4);

    const JD =
      1720994.5 +
      Math.floor(365.25 * Y) +
      Math.floor(30.6001 * (M + 1)) +
      B +
      this.#day +
      (this.#hour + this.#minute / 60 + this.#second / 3600 + 0 / 3600000) / 24;

    return JD;
  }

  get jd() {
    return this.toJD();
  }

  fromJD(jd: number) {
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
    return {
      year,
      month,
      day: Math.floor(day),
      hour: Math.floor(hour),
      minute,
      second,
    };
  }

  toGST() {
    const jd = this.toJD();
    const T = (jd - 2451545.0) / 36525;
    const gst = 6.6973745583 + 2400.0513369072 * T + 0.0000258622 * T * T;
    const timeFraction =
      this.#hour + this.#minute / 60 + this.#second / 3600 - this.#timezone; // TODO: need to test handle timezone
    return gst + timeFraction;
  }

  get gst() {
    return this.toGST();
  }

  protected resolveCalendar(options?: TimeOptions): CalendarSystem {
    return options?.calendar || CalendarSystem.Gregorian;
  }

  format(options?: TimeFormatOptions) {
    // return like: 12 April 1967 13:12:9.233
    // for month, utilize Date object
    const date = new Date(this.#year, this.#month - 1, this.#day);
    const month = date.toLocaleString(
      options?.locale || "en-US",
      options?.options || { month: "long" }
    );
    return `${this.#day} ${month} ${this.#year} ${this.#hour}:${this.#minute}:${
      this.#second
    }`;
  }
}
