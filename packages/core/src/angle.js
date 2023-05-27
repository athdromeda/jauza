const rad = (deg) => (deg * Math.PI) / 180;
const deg = (rad) => (rad * 180) / Math.PI;
const sin = (a) => Math.sin(rad(a));
const cos = (a) => Math.cos(rad(a));
const tan = (a) => Math.tan(rad(a));
const csc = (a) => 1 / sin(a);
const sec = (a) => 1 / cos(a);
const cot = (a) => 1 / tan(a);
const asin = (a) => deg(Math.asin(a));
const acos = (a) => deg(Math.acos(a));
const atan = (a) => deg(Math.atan(a));
const atan2 = (x, y) => deg(Math.atan2(x, y));
const acsc = (a) => asin(1 / a);
const asec = (a) => acos(1 / a);
const acot = (a) => atan(1 / a);

function decimalToDMS(decimal) {
  const degrees = Math.floor(Math.abs(decimal));
  const minutes = Math.floor((Math.abs(decimal) - degrees) * 60);
  const seconds = ((Math.abs(decimal) - degrees - minutes / 60) * 3600).toFixed(
    2
  );
  const direction = decimal >= 0 ? 'N' : 'S'; // Assuming positive values are in the northern hemisphere

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

function decimalToHMS(decimal, sep = 'ʰᵐˢ') {
  const hours = Math.floor(Math.abs(decimal));
  const minutes = Math.floor((Math.abs(decimal) - hours) * 60);
  const seconds = ((Math.abs(decimal) - hours - minutes / 60) * 3600).toFixed(
    2
  );
  const direction = decimal >= 0 ? '+' : '-'; // Assuming positive values are in the northern hemisphere

  return `${direction}${hours}${sep[0]} ${minutes}${sep[1]} ${seconds}${
    sep[2] || ''
  }`;
}

export {
  rad,
  deg,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  atan2,
  csc,
  sec,
  cot,
  acsc,
  asec,
  acot,
  decimalToDMS,
  decimalToHMS,
};
