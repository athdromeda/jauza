//ref Mekanika pak rinto hal 98
import { sin } from "../../math/trigonometry.js";

export function brown(time: Date): [number, number, number] {
  const jde = time.getTime() / 86400000 + 2440500.5;
  const t = (jde - 2451545) / 36525;
  const u = 218.317 + 481267.883 * t;
  const v = 134.954 + 477198.849 * t;
  const omega = 125.041 - 1934.142 * t;
  const l = 280.466 + 36000.769 * t;
  const m = 357.526 + 35999.05 * t;

  const lng = eclipticLongitude({ u, v, omega, l, m });
  const lat = eclipticLatitude({ lambda: lng, omega, u, v, m });
  return [lng, lat, 0];
}

function eclipticLongitude({
  u,
  v,
  omega,
  l,
  m,
}: {
  u: number;
  v: number;
  omega: number;
  l: number;
  m: number;
}) {
  const c1 = 22640 * sin(v) + 769 * sin(2 * v) + 36 * sin(3 * v);
  const c2 = -125 * sin(u - l);
  const c3 = 2370 * sin(2 * (u - v));
  const c4 = -668 * sin(m);
  const c5 = -412 * sin(2 * (u - omega)) + 212 * sin(2 * (u - l - v));
  const c6 =
    4586 * sin(2 * (u - l) - v) +
    206 * sin(2 * (u - l) - v - m) +
    192 * sin(2 * (u - l) + v) +
    165 * sin(2 * (u - l) - m) +
    148 * sin(v - m) -
    110 * sin(v + m);
  const C = (c1 + c2 + c3 + c4 + c5 + c6) / 3600; // from arcsec to deg

  return u + C;
}

function eclipticLatitude({
  lambda,
  omega,
  u,
  v,
  m,
}: {
  lambda: number;
  omega: number;
  u: number;
  v: number;
  m: number;
}) {
  const beta =
    18520 * sin(lambda - omega + 0.114 * sin(2 * (u - omega)) + 0.15 * sin(m)) -
    526 * sin(2 * lambda - u - omega) +
    44 * sin(2 * lambda - u - omega + v) -
    31 *
      sin(
        2 * lambda -
          u -
          omega -
          v -
          23 *
            sin(
              2 * lambda -
                u -
                omega +
                m +
                11 *
                  sin(
                    2 * lambda -
                      u -
                      omega -
                      m -
                      25 * sin(u - omega - 2 * v) +
                      21 * sin(u - omega - v)
                  )
            )
      );

  return beta / 3600; // from arcsec to deg
}
