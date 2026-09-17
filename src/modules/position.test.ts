import { describe, it, expect } from "vitest";
import {
  eclipticJ2000,
  equatorialJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
  type Reference,
} from "./position.js";
import { referencesEqual } from "./transform.js";

describe("Reference constants", () => {
  it("renames eclipticOfDate -> meanEclipticOfDate", () => {
    expect(meanEclipticOfDate).toEqual({ frame: "mean-of-date", orientation: "mean" });
  });

  it("shares a Reference across ecliptic/equatorial mean-of-date (System distinguishes them)", () => {
    expect(referencesEqual(meanEclipticOfDate, meanEquatorialOfDate)).toBe(true);
  });

  it("keeps the J2000 frames fixed", () => {
    expect(eclipticJ2000).toEqual({ frame: "j2000", orientation: "fixed" });
    expect(equatorialJ2000).toEqual({ frame: "j2000", orientation: "fixed" });
  });

  it("defines true-of-date references", () => {
    expect(trueEclipticOfDate).toEqual({ frame: "true-of-date", orientation: "true" });
    expect(trueEquatorialOfDate).toEqual({ frame: "true-of-date", orientation: "true" });
  });

  it("compares frame AND orientation", () => {
    const other: Reference = { frame: "j2000", orientation: "mean" };
    expect(referencesEqual(eclipticJ2000, other)).toBe(false);
  });
});