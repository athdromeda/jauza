import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Earth } from "../../../src/modules/earth.js";
import { Moon } from "../../../src/modules/moon.js";
import { Sun } from "../../../src/modules/sun.js";
import { Time } from "../../../src/modules/time.js";
import { trueEquatorialOfDate } from "../../../src/modules/position.js";
import type { AlgoConfig } from "../../../src/types.js";

/**
 * Topocentric horizontal validation against JPL DE421 via Skyfield (1.55).
 *
 * The fixtures in `fixtures/topocentric-horizons.json` were generated with
 * Skyfield + the DE421 kernel (independent of Jauza). Each case records the
 * GEOCENTRIC apparent-of-date RA/Dec and distance, which is fed into Jauza as
 * the algorithm's native true-equatorial-of-date pair, plus Skyfield's
 * TOPOCENTRIC geometric altitude/azimuth (no refraction). This isolates Jauza's
 * topocentric transformation (WGS-84 observer + ENU + apparent sidereal time)
 * from ephemeris accuracy.
 *
 * Regenerate with `python generate_fixtures.py` (Skyfield + de421.bsp); the
 * script is documented in `tests/validation/README.md`.
 *
 * Tolerances reflect the model differences (short-series nutation, IAU 1976
 * precession, UTC≈UT1) and observed agreement < 0.001°:
 *   - Moon: 0.01° (36″)
 *   - Sun:  0.005° (18″)
 */

const FIXTURES = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/topocentric-horizons.json", import.meta.url)), "utf8"),
) as Array<{
  label: string;
  utc: string;
  site: { lat: number; lng: number; elevationM: number };
  body: "SUN" | "MOON";
  geocentric_ra_deg: number;
  geocentric_dec_deg: number;
  geocentric_dist_km: number;
  expected_topocentric_alt_deg: number;
  expected_topocentric_az_deg: number;
}>;

const algoFromFixture = (c: (typeof FIXTURES)[number]): AlgoConfig => ({
  name: "skyfield-geocentric-fixture",
  bodies: ["SUN", "MOON"],
  SUN: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({
      lambda: c.geocentric_ra_deg,
      beta: c.geocentric_dec_deg,
      r: c.geocentric_dist_km,
    }),
  },
  MOON: {
    outputType: "ECLIPTIC",
    origin: "earth",
    system: "equatorial",
    reference: trueEquatorialOfDate,
    distanceUnit: "km",
    formula: () => ({
      lambda: c.geocentric_ra_deg,
      beta: c.geocentric_dec_deg,
      r: c.geocentric_dist_km,
    }),
  },
});

describe("topocentric horizontal vs DE421 (Skyfield)", () => {
  for (const c of FIXTURES) {
    const tolerance = c.body === "MOON" ? 0.01 : 0.005;
    it(`${c.label} (${c.body}, alt≈${c.expected_topocentric_alt_deg.toFixed(2)}°)`, () => {
      const bodyClass = c.body === "MOON" ? Moon : Sun;
      const obs = new Earth(c.site.lat, c.site.lng, c.site.elevationM)
        .at(new Time(new Date(c.utc)))
        .observe(bodyClass)
        .with(algoFromFixture(c));

      expect(obs.alt).toBeCloseTo(c.expected_topocentric_alt_deg, 3);
      const azDiff = Math.abs(obs.az - c.expected_topocentric_az_deg);
      expect(Math.min(azDiff, 360 - azDiff)).toBeLessThan(tolerance);
    });
  }
});