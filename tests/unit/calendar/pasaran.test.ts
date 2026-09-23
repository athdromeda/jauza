import { describe, it, expect } from "vitest";
import { Time } from "../../../src/modules/time.js";
import { getPasaranDay } from "../../../src/utils/pasaran.js";

describe("getPasaranDay", () => {
  it("should return Legi for 21 Juli 2012", () => {
    const t = new Time(2012, 7, 21);
    expect(getPasaranDay(t.jd)).toBe("Legi");
  });

  it("should return Pahing for 10 Desember 2011", () => {
    const t = new Time(2011, 12, 10);
    expect(getPasaranDay(t.jd)).toBe("Pahing");
  });

  it("should return Pon for 9 Maret 2016", () => {
    const t = new Time(2016, 3, 9);
    expect(getPasaranDay(t.jd)).toBe("Pon");
  });
});
