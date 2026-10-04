import { describe, it, expect } from "vitest";
import { Salat } from "../../src/modules/salat.js";
import { Time } from "../../src/modules/time.js";
import { Earth } from "../../src/modules/earth.js";
import { eclipticJ2000 } from "../../src/modules/position.js";
import type { AlgoConfig } from "../../src/types.js";

const sunStub: AlgoConfig = {
  name: "fixture-sun",
  bodies: ["SUN", "EARTH"],
  EARTH: {
    outputType: "ECLIPTIC",
    origin: "sun",
    system: "ecliptic",
    reference: eclipticJ2000,
    formula: () => ({ l: 0, b: 0, r: 1 }),
    distanceUnit: "au",
  },
};

describe("Salat", () => {
  it("uses an algorithm-provided eot override (seconds)", () => {
    const jakarta = new Earth(-6.166667, 106.85, 50);
    const customEotSeconds = 15;
    const mockAlgo: AlgoConfig = {
      ...sunStub,
      name: "mock-custom-eot",
      eot: (_jd: number) => customEotSeconds,
    };

    const salat = new Salat(new Time(2009, 6, 12, 12), { timezone: 7 })
      .at(jakarta)
      .with(mockAlgo);

    // eot() reports minutes; istiwa() applies minutes/60 → hours.
    expect(salat.eot()).toBeCloseTo(customEotSeconds / 60, 10);
    expect(salat.istiwa()).toBeCloseTo(
      12 + 7 - 106.85 / 15 - customEotSeconds / 60 / 60,
      6
    );
  });

  it("asTime returns a Time in the same timezone as the hour getters", () => {
    const jakarta = new Earth(-6.166667, 106.85, 50);
    const salat = new Salat(new Time(2009, 6, 12, 12), { timezone: 7 })
      .at(jakarta)
      .with(sunStub);

    const maghrib = salat.maghrib();
    const t = salat.asTime(maghrib);

    expect(t.timezone).toBe(7);
    expect(t.jd).toBeCloseTo(
      new Time(2009, 6, 12, maghrib, { timezone: 7 }).jd,
      9
    );
    expect(t.info).toMatchObject({
      year: 2009,
      month: 6,
      day: 12,
      timezone: 7,
    });
  });

  it("asTime uses the local calendar date, not the UTC date", () => {
    const jakarta = new Earth(-6.166667, 106.85, 50);
    const salat = new Salat(new Time(2009, 6, 12, 22), { timezone: 7 })
      .at(jakarta)
      .with(sunStub);

    const t = salat.asTime(5);

    expect(t.info).toMatchObject({
      year: 2009,
      month: 6,
      day: 13,
      hour: 5,
      timezone: 7,
    });
  });
});