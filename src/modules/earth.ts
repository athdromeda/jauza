import { getQibla as getQiblaDirection } from "../utils/qibla.js";
import { Body } from "./body.js";

export class Earth extends Body {
  lat: number;
  lng: number;
  h: number;
  #qibla: number | null = null;

  constructor(lat: number, lng: number, h: number, time: Date) {
    super(time);
    this.lat = lat;
    this.lng = lng;
    this.h = h;
  }

  getQibla() {
    this.#qibla = getQiblaDirection(this.lat, this.lng);
  }

  get qibla() {
    if (this.#qibla === null) {
      this.getQibla();
    }
    return this.#qibla;
  }
}
