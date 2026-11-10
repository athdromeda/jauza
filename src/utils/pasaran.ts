import { PASARAN_DAYS } from "../data/calendar.js";

export const getPasaranDay = (jd: number, timezone = 0) => {
  const dayIndex = Math.floor(jd + timezone / 24 - 0.5) % 5;
  return PASARAN_DAYS[dayIndex];
};
