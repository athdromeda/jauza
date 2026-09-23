import { describe, it, expect } from "vitest";
import { coordinateState, keyOf, type CoordinateStateKey } from "../../src/contract.js";
import { meanEclipticOfDate, type Position } from "../../src/modules/position.js";

const pos: Position = {
  representation: { kind: "spherical", lon: 10, lat: 0, r: 1 },
  origin: "moon",
  system: "ecliptic",
  reference: meanEclipticOfDate,
};

describe("contract", () => {
  it("keyOf derives a CoordinateStateKey from a Position", () => {
    const k = keyOf(pos);
    expect(k).toEqual({ system: "ecliptic", reference: meanEclipticOfDate, center: "moon" });
  });

  it("keyOf passes a key through", () => {
    const k: CoordinateStateKey = { system: "equatorial", reference: meanEclipticOfDate, center: "sun" };
    expect(keyOf(k)).toBe(k);
  });

  it("coordinateState fills value/key/epoch from a Position", () => {
    const s = coordinateState(pos, "MOON", 2451545.5, "TDB");
    expect(s.key.center).toBe("moon");
    expect(s.key.system).toBe("ecliptic");
    expect(s.value.x).toBeCloseTo(0.984807753, 9); // cos(10deg)
    expect(s.epoch).toBe(2451545.5);
    expect(s.timeScale).toBe("TDB");
  });
});