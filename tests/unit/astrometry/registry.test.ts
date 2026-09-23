import { describe, it, expect } from "vitest";
import {
  keyOf,
  coordinateState,
  type CoordinateStateKey,
} from "../../../src/contract.js";
import {
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
  type Position,
  type Reference,
  type System,
} from "../../../src/modules/position.js";
import { nutationAngles } from "../../../src/transformations/nutation.js";
import { cartToSph } from "../../../src/frames/convert.js";
import { EdgeRegistry, registerStandardEdges } from "../../../src/frames/registry.js";

const sph = (
  system: System,
  reference: Reference,
  lon: number,
  lat: number,
  r = 1
): Position => ({
  representation: { kind: "spherical", lon, lat, r },
  origin: "moon",
  system,
  reference,
});

describe("EdgeRegistry", () => {
  it("registers ecliptic<->equatorial, precession, and nutation edges for all six references", () => {
    const r = new EdgeRegistry();
    registerStandardEdges(r);
    const keys = r.keys();
    expect(keys).toContainEqual(
      keyOf({
        system: "equatorial",
        reference: trueEquatorialOfDate,
        center: "earth",
      })
    );
    expect(
      r.edgesFrom(
        keyOf({
          system: "equatorial",
          reference: meanEquatorialOfDate,
          center: "earth",
        })
      ).length
    ).toBeGreaterThan(0);

    // Center-parametric: the same standard edges exist for other centers.
    const rm = new EdgeRegistry();
    registerStandardEdges(rm, "moon");
    expect(rm.keys()).toContainEqual(
      keyOf({
        system: "ecliptic",
        reference: trueEclipticOfDate,
        center: "moon",
      })
    );
  });

  it("nutation edge shifts ecliptic longitude by dpsi only (spherical parity)", () => {
    const r = new EdgeRegistry();
    registerStandardEdges(r, "moon"); // fixture position is moon-centered
    const jd = 2448908.5;
    const state = coordinateState(
      sph("ecliptic", meanEclipticOfDate, 33, 4, 2),
      "MOON",
      jd,
      "TT"
    );
    const from = keyOf(state);
    const to = keyOf({
      system: "ecliptic",
      reference: trueEclipticOfDate,
      center: "moon",
    }) as CoordinateStateKey;
    const edge = r.find(from, to);
    expect(edge).toBeDefined();
    expect(edge!.correction).toBe("nutation");
    const { dpsi } = nutationAngles(jd);
    const v = edge!.apply(state.value, jd);
    const [lon] = cartToSph(v.x, v.y, v.z);
    expect(lon).toBeCloseTo(33 + dpsi, 8);
  });
});