import { describe, it, expect } from "vitest";
import { eclipticOfDate } from "./position.js";
import { Vec3 } from "./vec3.js";
import { assertSameFrame, createResolver, FrameMismatchError, MissingOriginOffsetError, relative, toCartesian, toOrigin, toSpherical } from "./transform.js";

const cartPos = (vec3: Vec3) =>
  ({
    representation: { kind: "cartesian", vec3 },
    origin: "earth",
    frame: eclipticOfDate,
  }) as const;

describe("toCartesian / toSpherical", () => {
  it("round-trips a cartesian position", () => {
    const sph = toSpherical(cartPos(new Vec3(3, 4, 5)));
    expect(sph.representation.kind).toBe("spherical");
    expect(sph.origin).toBe("earth");
    expect(sph.frame).toEqual(eclipticOfDate);

    const back = toCartesian(sph);
    expect(back.representation.kind).toBe("cartesian");
    expect(back.representation.vec3.x).toBeCloseTo(3);
    expect(back.representation.vec3.y).toBeCloseTo(4);
    expect(back.representation.vec3.z).toBeCloseTo(5);
  });

  it("is a no-op on a matching representation", () => {
    const pos = cartPos(new Vec3(3, 4, 5));
    expect(toCartesian(pos)).toBe(pos);
  });

  it("converts a spherical position to cartesian", () => {
    const sph = toSpherical(cartPos(new Vec3(1, 0, 0)));
    const back = toCartesian(sph);
    expect(back.representation.vec3.x).toBeCloseTo(1);
    expect(back.representation.vec3.y).toBeCloseTo(0);
    expect(back.representation.vec3.z).toBeCloseTo(0);
  });
});

describe("assertSameFrame", () => {
  it("throws FrameMismatchError on differing frames", () => {
    const j2000 = { type: "ecliptic", equinox: "J2000" } as const;
    expect(() => assertSameFrame(eclipticOfDate, j2000)).toThrow(FrameMismatchError);
  });

  it("passes for equal frames", () => {
    expect(() => assertSameFrame(eclipticOfDate, eclipticOfDate)).not.toThrow();
  });
});

const frame = eclipticOfDate;

const earthAtSun = {
  representation: { kind: "cartesian", vec3: new Vec3(1, 0, 0) },
  origin: "sun",
  frame,
} as const;

const moonAtEarth = {
  representation: { kind: "cartesian", vec3: new Vec3(0.00257, 0.001, 0) },
  origin: "earth",
  frame,
} as const;

const sunAtSun = {
  representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
  origin: "sun",
  frame,
} as const;

const homeEarth = {
  representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
  origin: "earth",
  frame,
} as const;

describe("createResolver", () => {
  it("expresses the sun from the earth (delta via earth-at-sun edge)", () => {
    const resolver = createResolver({ earth: earthAtSun });
    const v = resolver.delta("sun", "earth");
    expect(v.x).toBeCloseTo(-1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });

  it("chains offsets through earth (moon at sun)", () => {
    const resolver = createResolver({ earth: earthAtSun, moon: moonAtEarth });
    const v = resolver.delta("sun", "moon");
    expect(v.x).toBeCloseTo(-(1 + 0.00257));
    expect(v.y).toBeCloseTo(-0.001);
    expect(v.z).toBeCloseTo(0);
  });

  it("chains an arbitrary number of offsets regardless of depth", () => {
    const sunAtBarycenter = {
      representation: { kind: "cartesian", vec3: new Vec3(0.1, 0.2, 0) },
      origin: "barycenter",
      frame,
    } as const;
    const resolver = createResolver({ sun: sunAtBarycenter, earth: earthAtSun, moon: moonAtEarth });
    const v = resolver.delta("barycenter", "moon");
    expect(v.x).toBeCloseTo(-(0.1 + 1 + 0.00257));
    expect(v.y).toBeCloseTo(-(0.2 + 0.001));
    expect(v.z).toBeCloseTo(0);
  });

  it("walks the other direction through the same chain (sun from moon)", () => {
    const resolver = createResolver({ earth: earthAtSun, moon: moonAtEarth });
    const v = resolver.delta("moon", "sun");
    expect(v.x).toBeCloseTo(1 + 0.00257);
    expect(v.y).toBeCloseTo(0.001);
    expect(v.z).toBeCloseTo(0);
  });

  it("throws MissingOriginOffsetError when no path exists between origins", () => {
    const resolver = createResolver({ earth: earthAtSun });
    expect(() => resolver.delta("earth", "moon")).toThrow(MissingOriginOffsetError);
  });
});

describe("toOrigin", () => {
  it("moves the sun to the earth origin (geocentric sun)", () => {
    const resolver = createResolver({ earth: earthAtSun });
    const moved = toOrigin(sunAtSun, "earth", resolver);
    expect(moved.origin).toBe("earth");
    expect(moved.representation.kind).toBe("cartesian");
    expect((moved.representation as { kind: "cartesian"; vec3: Vec3 }).vec3.x).toBeCloseTo(-1);
  });

  it("moves the moon to the sun origin (heliocentric moon)", () => {
    const resolver = createResolver({ earth: earthAtSun, moon: moonAtEarth });
    const moved = toOrigin(moonAtEarth, "sun", resolver);
    const vec = (moved.representation as { kind: "cartesian"; vec3: Vec3 }).vec3;
    expect(moved.origin).toBe("sun");
    expect(vec.x).toBeCloseTo(1.00257);
    expect(vec.y).toBeCloseTo(0.001);
  });
});

describe("relative", () => {
  it("gives the sun as seen from earth", () => {
    const resolver = createResolver({ earth: earthAtSun });
    const pos = relative(homeEarth, sunAtSun, resolver);
    expect(pos.origin).toBe("earth");
    const vec = (pos.representation as { kind: "cartesian"; vec3: Vec3 }).vec3;
    expect(vec.x).toBeCloseTo(-1);
  });
});

import { toPosition } from "./transform.js";
import type { BodyConfig } from "../types.js";

const eclipticOut: BodyConfig = {
  outputType: "ECLIPTIC",
  origin: "earth",
  frame: eclipticOfDate,
  formula: () => ({ l: 10, b: 0, r: 1 }),
};

describe("toPosition", () => {
  it("wraps raw spherical output into a cartesian Position with metadata", () => {
    const pos = toPosition({ l: 10, b: 0, r: 1 }, eclipticOut);
    expect(pos.origin).toBe("earth");
    expect(pos.frame).toEqual(eclipticOfDate);
    expect(pos.representation.kind).toBe("cartesian");
    const cos10 = Math.cos((10 * Math.PI) / 180);
    const sin10 = Math.sin((10 * Math.PI) / 180);
    const vec = (pos.representation as { kind: "cartesian"; vec3: Vec3 }).vec3;
    expect(vec.x).toBeCloseTo(cos10);
    expect(vec.y).toBeCloseTo(sin10);
    expect(vec.z).toBeCloseTo(0);
  });
});