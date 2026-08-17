import { Body } from "./body.js";
import type { Time } from "./time.js";

export class Moon extends Body {
  constructor(time: Time) {
    super(time, "MOON");
  }
}
