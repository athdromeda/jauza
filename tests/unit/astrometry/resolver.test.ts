import { describe, it, expect } from "vitest";
import { EdgeRegistry, registerStandardEdges } from "../../../src/frames/registry.js";
import {
  coordinateState,
  keyOf,
  type CoordinateStateKey,
} from "../../../src/contract.js";
import {
  GraphResolver,
  UnsupportedTransformationError,
  DuplicateCorrectionError,
  applyCorrections,
} from "../../../src/modules/resolver.js";
import {
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  type Position,
} from "../../../src/modules/position.js";
import { nutationAngles } from "../../../src/transformations/nutation.js";
import { cartToSph, sphToCart } from "../../../src/frames/convert.js";
import { Vec3 } from "../../../src/modules/vec3.js";

const sph = (
  system: "ecliptic" | "equatorial",
  reference: Position["reference"],
  lon: number,
  lat: number,
  origin: Position["origin"] = "earth",
  r = 1
): Position => ({
  representation: { kind: "spherical", lon, lat, r },
  origin,
  system,
  reference,
});

describe("GraphResolver", () => {
  const registry = registerStandardEdges(new EdgeRegistry());
  const resolver = new GraphResolver(registry);
  const jd = 2448908.5;
  const ctx = { jd, timeScale: "TT" as const };

  it("resolves mean ecliptic seed to mean equatorial of date", () => {
    const seed = coordinateState(
      sph("ecliptic", meanEclipticOfDate, 90, 0),
      "MOON",
      jd,
      "TT"
    );
    const target: CoordinateStateKey = keyOf(
      sph("equatorial", meanEquatorialOfDate, 0, 0)
    );
    const out = resolver.resolve(seed, target, ctx);
    const [lon] = cartToSph(
      out.states.at(-1)!.state.value.x,
      out.states.at(-1)!.state.value.y,
      out.states.at(-1)!.state.value.z
    );
    expect(lon).toBeCloseTo(90, 8);
    expect(out.path.length).toBe(1);
  });

  it("resolve -> true-of-date applies the nutation correction step", () => {
    const seed = coordinateState(
      sph("ecliptic", meanEclipticOfDate, 133, 0),
      "MOON",
      jd,
      "TT"
    );
    const target: CoordinateStateKey = keyOf(
      sph("ecliptic", trueEclipticOfDate, 0, 0)
    );
    const out = resolver.resolve(seed, target, ctx);
    const { dpsi } = nutationAngles(jd);
    const [lon] = cartToSph(
      out.states.at(-1)!.state.value.x,
      out.states.at(-1)!.state.value.y,
      out.states.at(-1)!.state.value.z
    );
    expect(lon).toBeCloseTo(133 + dpsi, 8);
    expect(
      out.path.some((s) => s.corrections.includes("nutation"))
    ).toBe(true);
  });

  it("throws UnsupportedTransformationError for an unreachable key", () => {
    const seed = coordinateState(
      sph("ecliptic", meanEclipticOfDate, 1, 0, "barycenter"),
      "SUN",
      jd,
      "TT"
    );
    expect(() =>
      resolver.resolve(
        seed,
        keyOf(sph("ecliptic", meanEclipticOfDate, 1, 0, "sun")),
        ctx
      )
    ).toThrow(UnsupportedTransformationError);
  });

  it("applyCorrections appends one-shot correction edges and dedups vocabulary", () => {
    const seed = coordinateState(
      sph("ecliptic", trueEclipticOfDate, 40, 0),
      "MOON",
      jd,
      "TT"
    );
    const state = resolver.resolve(seed, keyOf(seed.position), ctx).seed;
    const annual = {
      from: keyOf(state),
      to: keyOf(state),
      cost: 0.1,
      correction: "annual-aberration" as const,
      label: "correction:annual-aberration",
      apply: (v: Vec3) => {
        const [lon, lat, r] = cartToSph(v.x, v.y, v.z);
        const [x, y, z] = sphToCart(lon - 0.00569, lat, r);
        return new Vec3(x, y, z);
      },
    };
    const out = applyCorrections(state, ctx, [annual]);
    const [lon] = cartToSph(
      out.state.value.x,
      out.state.value.y,
      out.state.value.z
    );
    expect(lon).toBeCloseTo(40 - 0.00569, 8);
    expect(() => applyCorrections(state, ctx, [annual, annual])).toThrow(
      DuplicateCorrectionError
    );
  });

  it("explain returns the chain from seed to target", () => {
    const seed = coordinateState(
      sph("ecliptic", meanEclipticOfDate, 20, 5),
      "SUN",
      jd,
      "TT"
    );
    const target = keyOf(sph("ecliptic", trueEclipticOfDate, 0, 0));
    const plan = resolver.explain(seed, target, ctx);
    expect(plan.path.length).toBeGreaterThan(0);
    expect(plan.path[0]!.from).toEqual(keyOf(seed));
    expect(plan.path.at(-1)!.to).toEqual(target);
  });
});