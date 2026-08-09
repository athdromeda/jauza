export { Earth } from "./modules/earth.js";
export { JulianCalendar } from "./modules/calendar/julian.js";
export { GregorianCalendar } from "./modules/calendar/gregorian.js";
export { HijriCalendar } from "./modules/calendar/hijri.js";

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
