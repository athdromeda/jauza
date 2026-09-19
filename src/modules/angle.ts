import { degToHms, hmsToDeg } from "../math/unit.js";

export class DMS {
  #deg: number;
  #min: number;
  #sec: number;

  constructor(deg: number, min?: number, sec?: number) {
    this.#deg = deg;
    this.#min = min || 0;
    this.#sec = sec || 0;
  }

  get deg() {
    return this.#deg;
  }

  get min() {
    return this.#min;
  }

  get sec() {
    return this.#sec;
  }

  get decimal() {
    return this.#deg + this.#min / 60 + this.#sec / 3600;
  }

  get hms() {
    return this.toHMS();
  }

  toHMS() {
    const { hours, minutes, seconds } = degToHms(this.decimal);
    return new HMS(hours, minutes, seconds);
  }

  format() {
    return formatDMS(this);
  }

  toString() {
    return this.format();
  }
}

export class HMS {
  #hour: number;
  #min: number;
  #sec: number;

  constructor(hour: number, min?: number, sec?: number) {
    this.#hour = hour;
    this.#min = min || 0;
    this.#sec = sec || 0;
  }

  get hour() {
    return this.#hour;
  }

  get min() {
    return this.#min;
  }

  get sec() {
    return this.#sec;
  }

  get decimal() {
    return this.#hour + this.#min / 60 + this.#sec / 3600;
  }

  toDMS() {
    const decimal = hmsToDeg(this.#hour, this.#min, this.#sec);
    return new DMS(decimal);
  }

  get dms() {
    return this.toDMS().decimal;
  }

  format() {
    return formatHMS(this);
  }

  toString() {
    return this.format();
  }
}

export function formatDMS(val: number | DMS): string {
  const decimal = typeof val === "number" ? val : val.decimal;
  const isNegative = decimal < 0;
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  const degStr = String(deg).padStart(2, "0");
  const minStr = String(min).padStart(2, "0");
  const secStr = sec.toFixed(2).padStart(5, "0");

  return `${isNegative ? "-" : ""}${degStr}° ${minStr}' ${secStr}"`;
}

export function formatHMS(val: number | HMS): string {
  const decimal = typeof val === "number" ? val : val.decimal;
  const isNegative = decimal < 0;
  const abs = Math.abs(decimal);
  const h = Math.floor(abs);
  const mFloat = (abs - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;

  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  const sStr = s.toFixed(2).padStart(5, "0");

  return `${isNegative ? "-" : ""}${hStr}h ${mStr}m ${sStr}s`;
}

export class Angle {
  #deg: number;

  constructor(deg: number) {
    this.#deg = deg;
  }

  get decimal() {
    return this.#deg;
  }

  get radians() {
    return (this.#deg * Math.PI) / 180;
  }

  get dms() {
    const d = Math.abs(this.#deg);
    const deg = Math.floor(d);
    const minFloat = (d - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60);
    return {
      deg: this.#deg < 0 ? -deg : deg,
      min,
      sec,
    };
  }

  get hms() {
    const totalHours = this.#deg / 15;
    const h = Math.floor(totalHours);
    const mFloat = (totalHours - h) * 60;
    const m = Math.floor(mFloat);
    const s = Math.round((mFloat - m) * 60);
    return { hour: h, min: m, sec: s };
  }

  toString() {
    return formatDMS(this.#deg);
  }

  static fromDMS(deg: number, min: number, sec: number) {
    const sign = deg < 0 ? -1 : 1;
    return new Angle(sign * (Math.abs(deg) + min / 60 + sec / 3600));
  }

  static fromRadians(rad: number) {
    return new Angle((rad * 180) / Math.PI);
  }
}
