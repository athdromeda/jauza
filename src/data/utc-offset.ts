/**
 * TAI−UTC history, transcribed verbatim from ERFA
 * (https://raw.githubusercontent.com/liberfa/erfa/master/src/dat.c)
 *
 * - `year`/`month`: first month from which `delat` applies.
 * - `delat`: TAI−UTC (seconds) at the start of that month.
 * - `driftMjd`: reference MJD of the linear drift term (pre-1972 rows only).
 * - `rate`: drift rate in seconds/day (0 from 1972-01-01 onward).
 */
export type UtcOffsetRow = {
  readonly year: number;
  readonly month: number;
  readonly delat: number;
  readonly driftMjd: number;
  readonly rate: number;
};

/** 1960-01-01 00:00 UTC */
export const UTC_START_JD = 2436934.5;

export const UTC_OFFSET_ROWS: readonly UtcOffsetRow[] = [
  { year: 1960, month: 1, delat: 1.4178180, driftMjd: 37300.0, rate: 0.0012960 },
  { year: 1961, month: 1, delat: 1.4228180, driftMjd: 37300.0, rate: 0.0012960 },
  { year: 1961, month: 8, delat: 1.3728180, driftMjd: 37300.0, rate: 0.0012960 },
  { year: 1962, month: 1, delat: 1.8458580, driftMjd: 37665.0, rate: 0.0011232 },
  { year: 1963, month: 11, delat: 1.9458580, driftMjd: 37665.0, rate: 0.0011232 },
  { year: 1964, month: 1, delat: 3.2401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1964, month: 4, delat: 3.3401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1964, month: 9, delat: 3.4401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1965, month: 1, delat: 3.5401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1965, month: 3, delat: 3.6401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1965, month: 7, delat: 3.7401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1965, month: 9, delat: 3.8401300, driftMjd: 38761.0, rate: 0.0012960 },
  { year: 1966, month: 1, delat: 4.3131700, driftMjd: 39126.0, rate: 0.0025920 },
  { year: 1968, month: 2, delat: 4.2131700, driftMjd: 39126.0, rate: 0.0025920 },
  { year: 1972, month: 1, delat: 10.0, driftMjd: 0, rate: 0 },
  { year: 1972, month: 7, delat: 11.0, driftMjd: 0, rate: 0 },
  { year: 1973, month: 1, delat: 12.0, driftMjd: 0, rate: 0 },
  { year: 1974, month: 1, delat: 13.0, driftMjd: 0, rate: 0 },
  { year: 1975, month: 1, delat: 14.0, driftMjd: 0, rate: 0 },
  { year: 1976, month: 1, delat: 15.0, driftMjd: 0, rate: 0 },
  { year: 1977, month: 1, delat: 16.0, driftMjd: 0, rate: 0 },
  { year: 1978, month: 1, delat: 17.0, driftMjd: 0, rate: 0 },
  { year: 1979, month: 1, delat: 18.0, driftMjd: 0, rate: 0 },
  { year: 1980, month: 1, delat: 19.0, driftMjd: 0, rate: 0 },
  { year: 1981, month: 7, delat: 20.0, driftMjd: 0, rate: 0 },
  { year: 1982, month: 7, delat: 21.0, driftMjd: 0, rate: 0 },
  { year: 1983, month: 7, delat: 22.0, driftMjd: 0, rate: 0 },
  { year: 1985, month: 7, delat: 23.0, driftMjd: 0, rate: 0 },
  { year: 1988, month: 1, delat: 24.0, driftMjd: 0, rate: 0 },
  { year: 1990, month: 1, delat: 25.0, driftMjd: 0, rate: 0 },
  { year: 1991, month: 1, delat: 26.0, driftMjd: 0, rate: 0 },
  { year: 1992, month: 7, delat: 27.0, driftMjd: 0, rate: 0 },
  { year: 1993, month: 7, delat: 28.0, driftMjd: 0, rate: 0 },
  { year: 1994, month: 7, delat: 29.0, driftMjd: 0, rate: 0 },
  { year: 1996, month: 1, delat: 30.0, driftMjd: 0, rate: 0 },
  { year: 1997, month: 7, delat: 31.0, driftMjd: 0, rate: 0 },
  { year: 1999, month: 1, delat: 32.0, driftMjd: 0, rate: 0 },
  { year: 2006, month: 1, delat: 33.0, driftMjd: 0, rate: 0 },
  { year: 2009, month: 1, delat: 34.0, driftMjd: 0, rate: 0 },
  { year: 2012, month: 7, delat: 35.0, driftMjd: 0, rate: 0 },
  { year: 2015, month: 7, delat: 36.0, driftMjd: 0, rate: 0 },
  { year: 2017, month: 1, delat: 37.0, driftMjd: 0, rate: 0 },
];