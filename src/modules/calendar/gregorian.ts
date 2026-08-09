import { CalendarSystem } from "../../types.js";
import { Time } from "../time.js";

export class GregorianCalendar extends Time {
  protected resolveCalendar() {
    return CalendarSystem.Gregorian;
  }
}
