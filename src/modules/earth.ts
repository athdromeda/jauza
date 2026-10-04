import { topocentricHorizontal } from "../math/topocentric.js";
import { getQibla as getQiblaDirection } from "../utils/qibla.js";
import { Body } from "./body.js";
import { Time } from "./time.js";

type CoordinateArray = [number, number] | [number, number, number];

export class Earth extends Body {
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
    super(time ?? Time.now(), "EARTH");

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

  /**
   * Topocentric horizontal coordinates of the observed body. When the target
   * publishes a dedicated apparent source the apparent true-equatorial-of-date
   * vector is used; otherwise the geometric vector is used (legacy behavior).
   * Either way the WGS-84 observer position is subtracted and the result is
   * rotated into local east/north/up. Geometric (unrefracted).
   */
  get horizontal() {
    const seed = this.horizontalSeed;
    const equatorial = this.resolveHorizontal(seed);
    const v = equatorial.value;
    return topocentricHorizontal(
      [v.x, v.y, v.z],
      { latitude: this.lat, longitude: this.lng, elevationM: this.h },
      this.time.gast
    );
  }

  get alt() {
    return this.horizontal.alt.decimal;
  }

  get az() {
    return this.horizontal.az.decimal;
  }
}
