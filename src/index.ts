export { Earth } from "./modules/earth.js";
export { JulianCalendar } from "./modules/calendar/julian.js";
export { getJD } from "./utils/time.js";

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
