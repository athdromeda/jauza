import { CalendarSystem } from "../../types.js";
import { Time } from "../time.js";

export class JulianCalendar extends Time {
  protected resolveCalendar() {
    return CalendarSystem.Julian;
  }
}
