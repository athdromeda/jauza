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
    const { deg, min, sec } = this.dms;
    return `${deg}° ${min}' ${sec}"`;
  }

  static fromDMS(deg: number, min: number, sec: number) {
    const sign = deg < 0 ? -1 : 1;
    return new Angle(sign * (Math.abs(deg) + min / 60 + sec / 3600));
  }

  static fromRadians(rad: number) {
    return new Angle((rad * 180) / Math.PI);
  }
}
