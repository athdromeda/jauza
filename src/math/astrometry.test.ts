import { describe, it, expect } from "vitest";
import { eclipticToEquatorial, equatorialToEcliptic } from "./astrometry.js";
import { DMS, HMS } from "../modules/angle.js";

describe("astrometry", () => {
  it("should convert ecliptic to equatorial", () => {
    const ecliptic = { l: new DMS(39, 27, 54), b: new DMS(4, 59, 18), r: 1 };
    const epsilon = 23.439607;
    const equatorial = eclipticToEquatorial(ecliptic, epsilon);

    expect(equatorial.dec.decimal).toBeCloseTo(19 + 22 / 60 + 9 / 3600, 4);
    expect(equatorial.ra.decimal).toBeCloseTo(35.389914, 4);
  });

  it("should convert equatorial to ecliptic", () => {
    const equatorial = {
      ra: new HMS(2, 12, 17.5).toDMS(),
      dec: new DMS(13, 18, 40.3),
    };
    const epsilon = 23.439607;
    const ecliptic = equatorialToEcliptic(equatorial, epsilon);

    expect(ecliptic.l.decimal).toBeCloseTo(35.366773, 4);
    expect(ecliptic.b.decimal).toBeCloseTo(0.000013, 4);
  });
});
