import { CalendarSystem } from "../../types.js";
import { Time } from "../time.js";
import { HijriCalendar } from "./hijri.js";

export class GregorianCalendar extends Time {
  protected resolveCalendar() {
    return CalendarSystem.Gregorian;
  }

  toHijri() {
    return new HijriCalendar(this.jd);
  }
}
