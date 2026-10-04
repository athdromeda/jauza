import { callable } from "./utils/callable.js";
import type { TimeCallSignatures } from "./utils/callable.js";

import { Earth as EarthClass } from "./modules/earth.js";
import { Moon as MoonClass } from "./modules/moon.js";
import { Sun as SunClass } from "./modules/sun.js";
import { JulianCalendar as JulianCalendarClass } from "./modules/calendar/julian.js";
import { GregorianCalendar as GregorianCalendarClass } from "./modules/calendar/gregorian.js";
import { HijriCalendar as HijriCalendarClass } from "./modules/calendar/hijri.js";
import { Time as TimeClass } from "./modules/time.js";
import { Angle as AngleClass } from "./modules/angle.js";
import { Qibla as QiblaClass } from "./modules/qibla.js";
import { Rukyat as RukyatClass } from "./modules/rukyat.js";
import { RashdQibla as RashdQiblaClass } from "./modules/rashd-qibla.js";
import { Salat as SalatClass } from "./modules/salat.js";

export type Time = TimeClass;
export const Time = callable(TimeClass) as typeof TimeClass &
  TimeCallSignatures<Time>;

export type JulianCalendar = JulianCalendarClass;
export const JulianCalendar = callable(JulianCalendarClass) as typeof JulianCalendarClass &
  TimeCallSignatures<JulianCalendar>;

export type GregorianCalendar = GregorianCalendarClass;
export const GregorianCalendar = callable(GregorianCalendarClass) as typeof GregorianCalendarClass &
  TimeCallSignatures<GregorianCalendar>;

export type HijriCalendar = HijriCalendarClass;
export const HijriCalendar = callable(HijriCalendarClass) as typeof HijriCalendarClass &
  TimeCallSignatures<HijriCalendar>;

export type Earth = EarthClass;
export const Earth = callable(EarthClass);

export type Moon = MoonClass;
export const Moon = callable(MoonClass);

export type Sun = SunClass;
export const Sun = callable(SunClass);

export type Angle = AngleClass;
export const Angle = callable(AngleClass);

export type Qibla = QiblaClass;
export const Qibla = callable(QiblaClass);

export type Rukyat = RukyatClass;
export const Rukyat = callable(RukyatClass);

export type RashdQibla = RashdQiblaClass<"GLOBAL" | "LOCAL">;

export interface RashdQiblaCallable {
  (): RashdQiblaClass<"GLOBAL">;
  (year: number): RashdQiblaClass<"GLOBAL">;
  (time: Time): RashdQiblaClass<"LOCAL">;
  new (): RashdQiblaClass<"GLOBAL">;
  new (year: number): RashdQiblaClass<"GLOBAL">;
  new (time: Time): RashdQiblaClass<"LOCAL">;
}

export const RashdQibla = callable(RashdQiblaClass) as RashdQiblaCallable;

export type Salat = SalatClass;
export const Salat = callable(SalatClass);

export { getQibla, spherical, vincenty, type QiblaMethod } from "./utils/qibla.js";

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
export * from "./algos-contract.js";
export * from "./utils/conjunction.js";
export * from "./utils/visibility.js";
export type {
  VisibilityOptions,
  VisibilityResult,
} from "./modules/rukyat.js";
export type { VisibilityGeometry } from "./utils/visibility-geometry.js";
