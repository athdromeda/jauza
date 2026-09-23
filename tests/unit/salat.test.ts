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
  },
};

describe("Salat", () => {
  it("uses an algorithm-provided eot override (minutes)", () => {
    const jakarta = new Earth(-6.166667, 106.85, 50);
    const customEotMinutes = 15;
    const mockAlgo: AlgoConfig = {
      ...sunStub,
      name: "mock-custom-eot",
      eot: (_jd: number) => customEotMinutes,
    };

    const salat = new Salat(new Time(2009, 6, 12, 12), { timezone: 7 })
      .at(jakarta)
      .with(mockAlgo);

    expect(salat.eot()).toBeCloseTo(customEotMinutes / 60, 10);
    expect(salat.istiwa()).toBeCloseTo(
      12 + 7 - 106.85 / 15 - customEotMinutes / 60 / 60,
      6
    );
  });
});