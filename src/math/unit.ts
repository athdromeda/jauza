export const degToHms = (deg: number) => {
  const hours = Math.floor(deg / 15);
  const minutes = Math.floor((deg % 15) * 4);
  const seconds = Math.round(((deg % 15) * 4 - minutes) * 60);
  return { hours, minutes, seconds };
};

export const hmsToDeg = (hours: number, minutes: number, seconds: number) => {
  return hours * 15 + minutes * 0.25 + seconds * 0.004166666666666667;
};
