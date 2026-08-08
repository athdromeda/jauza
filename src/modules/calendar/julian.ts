// JulianCalendar
// JulianCalendar(year, month, day, hour, minute, second, millisecond)
// mimics Date class

export class JulianCalendar {
  private year: number;
  private month: number;
  private day: number;
  private hour: number;
  private minute: number;
  private second: number;
  private millisecond: number;

  constructor(
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0,
    millisecond: number = 0
  ) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.millisecond = millisecond;
  }

  getUTCFullYear() {
    return this.year;
  }

  getUTCMonth() {
    return this.month - 1;
  }

  getUTCDate() {
    return this.day;
  }

  getUTCHours() {
    return this.hour;
  }

  getUTCMinutes() {
    return this.minute;
  }

  getUTCSeconds() {
    return this.second;
  }

  getMilliseconds() {
    return this.millisecond;
  }
}
