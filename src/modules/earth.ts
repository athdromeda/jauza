import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  xyzToEcliptic,
} from "../math/astrometry.js";
import { normalizeHour } from "../math/unit.js";
import { getQibla as getQiblaDirection } from "../utils/qibla.js";
import { Body } from "./body.js";
import { Time } from "./time.js";

type CoordinateArray = [number, number] | [number, number, number];

export class Earth extends Body {
  readonly type = "EARTH";
  lat: number;
  lng: number;
  h: number;
  #qibla: number | null = null;

  constructor(
    lat: number | CoordinateArray,
    lng: number | CoordinateArray,
    h?: number,
    time?: Time
  ) {
    super(time ?? Time.now());

    if (Array.isArray(lat)) {
      const isNegative = lat[0] < 0;
      this.lat = Math.abs(lat[0]) + lat[1] / 60 + (lat[2] || 0) / 3600;
      if (isNegative) {
        this.lat = -this.lat;
      }
    } else {
      this.lat = lat;
    }
    if (Array.isArray(lng)) {
      const isNegative = lng[0] < 0;
      this.lng = Math.abs(lng[0]) + lng[1] / 60 + (lng[2] || 0) / 3600;
      if (isNegative) {
        this.lng = -this.lng;
      }
    } else {
      this.lng = lng;
    }
    this.h = h ?? 0;
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

  get horizontal() {
    const equatorial = eclipticToEquatorial(this.ecliptic);
    const lst = normalizeHour(this.time.gst + this.lng / 15);
    const ha = lst * 15 - equatorial.ra.decimal;
    return equatorialToHorizontal(equatorial, this.lat, ha);
  }

  get alt() {
    return this.horizontal.alt.decimal;
  }

  get az() {
    return this.horizontal.az.decimal;
  }
}
