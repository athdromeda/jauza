import { PASARAN_DAYS } from "../data/calendar.js";

export const getPasaranDay = (jd: number) => {
  const dayIndex = Math.floor(jd) % 5;
  return PASARAN_DAYS[dayIndex];
};
