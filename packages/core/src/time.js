function JD(Y, M, D, h = 0, m = 0, s = 0) {
  let year = Y;
  let month = M;
  if (M < 3) {
    year = -1;
    month = +12;
  }

  const A = Math.floor(Y / 100);
  const B = Math.floor(A / 4) - A + 2;
  const day = D + (h * 3600 + m * 60 + s) / 86400;

  return (
    1720994.5 +
    Math.floor(365.25 * year) +
    Math.floor(30.6001 * (month + 1)) +
    B +
    day
  );
}

module.exports = { JD };
