export const PASARAN_DAYS = [
  "Pahing",
  "Pon",
  "Wage",
  "Kliwon",
  "Legi",
] as const;

export const getPasaranDay = (jd: number) => {
  const dayIndex = Math.floor(jd) % 5;
  return PASARAN_DAYS[dayIndex];
};
