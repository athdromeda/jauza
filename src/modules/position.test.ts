import { describe, it, expect } from "vitest";
import { eclipticOfDate, equatorialOfDate } from "./position.js";

describe("position types", () => {
  it("exports of-date frame constants", () => {
    expect(eclipticOfDate).toEqual({ type: "ecliptic", equinox: "date" });
    expect(equatorialOfDate).toEqual({ type: "equatorial", equinox: "date" });
  });
});
