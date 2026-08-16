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
