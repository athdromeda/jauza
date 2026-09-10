import { decToHms, normalizeHour } from "../math/unit.js";
import {
  CalendarSystem,
  type CivilTime,
  type TimeFormatOptions,
  type TimeOptions,
} from "../types.js";
import { getPasaranDay } from "../utils/pasaran.js";
import { getDeltaT } from "../utils/time.js";
import { HIJRI_MONTHS } from "../data/calendar.js";

export class Time {
  #jd: number;
  #timezone: number;
  #calendar: CalendarSystem;
  #civil: CivilTime | null = null;

  constructor(jd: number);
  constructor(jd: number, options?: TimeOptions);
  constructor(date: Date);
  constructor(date: Date, options?: TimeOptions);
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
    if (jdOrDate instanceof Date) {
      const opts = month as TimeOptions | undefined;
      this.#timezone = opts?.timezone ?? 0;
      this.#calendar = this.resolveCalendar(opts);
      this.#jd = this.civilToJDUt(
        jdOrDate.getUTCFullYear(),
        jdOrDate.getUTCMonth() + 1,
        jdOrDate.getUTCDate(),
        jdOrDate.getUTCHours(),
        jdOrDate.getUTCMinutes(),
        jdOrDate.getUTCSeconds()
      );
      return;
    }

    if (
      arguments.length === 1 ||
      (arguments.length === 2 && typeof month === "object")
    ) {
      const opts = month as TimeOptions | undefined;
      this.#jd = jdOrDate;
      this.#timezone = opts?.timezone ?? 0;
      this.#calendar = this.resolveCalendar(opts);
      return;
    }

    const numerics: number[] = [];
    let opts: TimeOptions | undefined = options;

    [month, dayOrOptions, hour, minute, second]
      .filter((v) => v !== undefined)
      .forEach((v) => {
        if (typeof v === "number") {
          numerics.push(v);
        } else {
          opts = v;
        }
      });

    this.#timezone = opts?.timezone ?? 0;
    this.#calendar = this.resolveCalendar(opts);
    this.#jd =
      this.civilToJDUt(
        jdOrDate,
        numerics[0] ?? 1,
        numerics[1] ?? 1,
        numerics[2] ?? 0,
        numerics[3] ?? 0,
        numerics[4] ?? 0
      ) -
      this.#timezone / 24;
  }

  get jd() {
    return this.#jd;
  }

  protected civilToJDUt(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
  ): number {
    const M = month >= 3 ? month : month + 12;
    const Y = month >= 3 ? year : year - 1;

    const A = Math.floor(Y / 100);
    const gregorian =
      this.#calendar !== CalendarSystem.Julian &&
      this.isGregorianDate(year, month, day);
    const B = gregorian ? 2 - A + Math.floor(A / 4) : 0;

    return (
      1720994.5 +
      Math.floor(365.25 * Y) +
      Math.floor(30.6001 * (M + 1)) +
      B +
      day +
      (hour + minute / 60 + second / 3600) / 24
    );
  }

  protected isGregorianDate(year: number, month: number, day: number): boolean {
    if (year > 1582) return true;
    if (year < 1582) return false;
    if (month > 10) return true;
    if (month < 10) return false;
    return day >= 15;
  }

  protected getCivil(): CivilTime {
    if (this.#civil === null) {
      this.#civil = this.fromJD(this.#jd + this.#timezone / 24);
    }
    return this.#civil;
  }

  get info() {
    const civil = this.getCivil();
    return {
      year: civil.year,
      month: civil.month,
      day: civil.day,
      hour: civil.hour,
      minute: civil.minute,
      second: civil.second,
      timezone: this.#timezone,
      calendar: this.#calendar,
    };
  }

  get year() {
    return this.getCivil().year;
  }

  get month() {
    return this.getCivil().month;
  }

  get day() {
    return this.getCivil().day;
  }

  get hour() {
    return this.getCivil().hour;
  }

  get minute() {
    return this.getCivil().minute;
  }

  get second() {
    return this.getCivil().second;
  }

  get timezone() {
    return this.#timezone;
  }

  get calendar() {
    return this.#calendar;
  }

  fromJD(jd: number): CivilTime {
    const jd1 = jd + 0.5;
    const Z = Math.floor(jd1);
    const F = jd1 - Z;
    const A =
      this.#calendar === CalendarSystem.Julian || Z < 2299161
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
    const hmsInDecimal = decToHms(
      Math.round((day - Math.floor(day)) * 24 * 1e6) / 1e6
    );
    return {
      year,
      month,
      day: Math.floor(day),
      hour: Math.floor(hmsInDecimal.hours),
      minute: hmsInDecimal.minutes,
      second: hmsInDecimal.seconds,
    };
  }

  toGST() {
    const jd = this.#jd;
    const T = (jd - 2451545.0) / 36525;
    const gst = 6.6973745583 + 2400.0513369072 * T + 0.0000258622 * T * T;
    const { hour, minute, second } = this.fromJD(jd);
    const timeFraction = hour + minute / 60 + second / 3600;
    return normalizeHour(gst + timeFraction);
  }

  get gst() {
    return this.toGST();
  }

  asDT() {
    const year = this.year;
    const deltaT = getDeltaT(year) / 86400;
    return new Time(this.#jd - deltaT, {
      timezone: this.#timezone,
      calendar: this.#calendar,
    });
  }

  protected resolveCalendar(options?: TimeOptions): CalendarSystem {
    return options?.calendar || CalendarSystem.Gregorian;
  }

  private formatString(pattern: string, locale?: string, hijriMonths?: string[]): string {
    const civil = this.getCivil();
    const loc = locale || "en-US";
    const isHijri = this.#calendar === CalendarSystem.Hijri;
    const date = new Date(civil.year, civil.month - 1, civil.day);

    const dayName = new Intl.DateTimeFormat(loc, { weekday: "long" }).format(
      date
    );
    const dayNameShort = new Intl.DateTimeFormat(loc, {
      weekday: "short",
    }).format(date);

    let monthName: string;
    let monthNameShort: string;

    if (isHijri) {
      const months = hijriMonths || [...HIJRI_MONTHS];
      monthName = months[civil.month - 1] || "";
      monthNameShort = monthName.slice(0, 3);
    } else {
      monthName = new Intl.DateTimeFormat(loc, { month: "long" }).format(date);
      monthNameShort = new Intl.DateTimeFormat(loc, {
        month: "short",
      }).format(date);
    }

    const h12 = civil.hour % 12 || 12;
    const ampm = civil.hour < 12 ? "AM" : "PM";

    const pasaran = getPasaranDay(this.jd) || "Kliwon";

    const tokens: Record<string, string> = {
      YYYY: String(civil.year),
      YY: String(civil.year).slice(-2),
      MMMM: monthName,
      MMM: monthNameShort,
      MM: String(civil.month).padStart(2, "0"),
      M: String(civil.month),
      DD: String(civil.day).padStart(2, "0"),
      D: String(civil.day),
      dddd: dayName,
      ddd: dayNameShort,
      HH: String(civil.hour).padStart(2, "0"),
      H: String(civil.hour),
      hh: String(h12).padStart(2, "0"),
      h: String(h12),
      mm: String(civil.minute).padStart(2, "0"),
      m: String(civil.minute),
      ss: String(civil.second).padStart(2, "0"),
      s: String(civil.second),
      A: ampm,
      a: ampm.toLowerCase(),
      PPP: pasaran.charAt(0).toUpperCase() + pasaran.slice(1),
      PP: pasaran.charAt(0).toUpperCase() + pasaran.slice(1),
      P: pasaran.charAt(0).toUpperCase() + pasaran.slice(1),
      ppp: pasaran.toLowerCase(),
      pp: pasaran.toLowerCase(),
      p: pasaran.toLowerCase(),
    };

    return pattern.replace(
      /dddd|ddd|YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|PPP|PP|ppp|pp|P|p|A|a/g,
      (match) => tokens[match] || match
    );
  }

  format(): string;
  format(pattern: string): string;
  format(options: TimeFormatOptions): string;
  format(pattern: string, options: TimeFormatOptions): string;
  format(patternOrOptions?: string | TimeFormatOptions, options?: TimeFormatOptions): string {
    if (typeof patternOrOptions === "string") {
      return this.formatString(patternOrOptions, options?.locale, options?.hijriMonths);
    }

    const civil = this.getCivil();
    const isHijri = this.#calendar === CalendarSystem.Hijri;
    const date = new Date(civil.year, civil.month - 1, civil.day);

    let month: string;
    if (isHijri) {
      const months = patternOrOptions?.hijriMonths || [...HIJRI_MONTHS];
      month = months[civil.month - 1] || "";
    } else {
      month = date.toLocaleString(
        patternOrOptions?.locale || "en-US",
        patternOrOptions?.options || { month: "long" }
      );
    }

    return `${civil.day} ${month} ${civil.year} ${civil.hour}:${civil.minute}:${civil.second}`;
  }

  static now() {
    return new Time(new Date());
  }
}
