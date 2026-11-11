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

  it("should keep the same pasaran for the whole civil day", () => {
    const t = new Time(2012, 7, 21, 13);
    expect(t.format("dddd PPP")).toBe("Saturday Legi");
    expect(new Time(2012, 7, 21, 23, 59).format("PPP")).toBe("Legi");
  });

  it("should use the local day when a timezone is set", () => {
    const t = new Time(2012, 7, 21, 20, { timezone: 7 });
    expect(t.format("dddd PPP")).toBe("Saturday Legi");
    expect(new Time(2012, 7, 22, 6, { timezone: 7 }).format("dddd PPP")).toBe("Sunday Pahing");
  });
});
