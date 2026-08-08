import { Body } from "./body.js";

export class Earth extends Body {
  lat: number;
  lng: number;
  h: number;

  constructor(lat: number, lng: number, h: number, time: Date) {
    super(time);
    this.lat = lat;
    this.lng = lng;
    this.h = h;
  }
}
