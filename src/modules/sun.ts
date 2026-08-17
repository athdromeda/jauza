import { Body } from "./body.js";
import type { Time } from "./time.js";

export class Sun extends Body {
  constructor(time: Time) {
    super(time, "SUN");
  }
}