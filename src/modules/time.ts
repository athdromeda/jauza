import { CalendarSystem, type TimeOptions } from "../types.js";

export class Time {
  #year: number;
  #month: number;
  #day: number;
  #hour: number;
  #minute: number;
  #second: number;
  #timezone: number;
  #calendar: CalendarSystem;

  constructor(year: number);
  constructor(date: Date);
  constructor(year: number, month: number, options?: TimeOptions);
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
    yearOrDate: number | Date,
    month?: number,
    dayOrOptions?: number | TimeOptions,
    hour?: number | TimeOptions,
    minute?: number | TimeOptions,
    second?: number | TimeOptions,
    options?: TimeOptions
  ) {
    if (typeof yearOrDate === "number") {
      this.#year = yearOrDate;
      this.#month = month || 1;
      this.#day = (dayOrOptions as number) || 1;
      this.#hour = (hour as number) || 0;
      this.#minute = (minute as number) || 0;
      this.#second = (second as number) || 0;
      this.#timezone = (options as TimeOptions)?.timezone || 0;
      this.#calendar = this.resolveCalendar(options);
    } else {
      this.#year = yearOrDate.getUTCFullYear();
      this.#month = yearOrDate.getUTCMonth() + 1;
      this.#day = yearOrDate.getUTCDate();
      this.#hour = yearOrDate.getUTCHours();
      this.#minute = yearOrDate.getUTCMinutes();
      this.#second = yearOrDate.getUTCSeconds();
      this.#timezone = (options as TimeOptions)?.timezone || 0;
      this.#calendar = this.resolveCalendar(options);
    }
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

    // console.table({
    //   year: this.#year,
    //   month: this.#month,
    //   day: this.#day,
    //   hour: this.#hour,
    //   minute: this.#minute,
    //   second: this.#second,
    //   M,
    //   Y,
    //   A,
    //   B,
    //   JD,
    // });
    return JD;
  }

  get jd() {
    return this.toJD();
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
}
