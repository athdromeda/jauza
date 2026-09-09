export { Earth } from "./modules/earth.js";
export { Moon } from "./modules/moon.js";
export { Sun } from "./modules/sun.js";
export { JulianCalendar } from "./modules/calendar/julian.js";
export { GregorianCalendar } from "./modules/calendar/gregorian.js";
export { HijriCalendar } from "./modules/calendar/hijri.js";
export { Time } from "./modules/time.js";
export { Angle } from "./modules/angle.js";
export { getQibla } from "./utils/qibla.js";
export { Rukyat } from "./modules/rukyat.js";
export { Salat } from "./modules/salat.js";

export function getEnv() {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  } else if (
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
  ) {
    return "node";
  }
  return "unknown";
}

export * from "./math/index.js";
export * from "./algos/index.js";
