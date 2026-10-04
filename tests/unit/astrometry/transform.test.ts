import { describe, expect, it } from "vitest";
import {
  eclipticJ2000,
  equatorialJ2000,
  meanEclipticOfDate,
  meanEquatorialOfDate,
  trueEclipticOfDate,
  trueEquatorialOfDate,
} from "../../../src/modules/position.js";
import { Vec3 } from "../../../src/modules/vec3.js";
import {
  AU_KM,
  EARTH_RADIUS_KM,
  toKm,
  UnsupportedDistanceUnitError,
} from "../../../src/math/unit.js";
import {
  assertSameReference,
  createResolver,
  FrameMismatchError,
  MissingOriginOffsetError,
  normalizeBodyOutput,
  referencesEqual,
  relative,
  toCartesian,
  toOrigin,
  toPosition,
  toSpherical,
} from "../../../src/modules/transform.js";

const cartPos = (vec3: Vec3) =>
  ({
    representation: { kind: "cartesian", vec3 },
    origin: "earth",
    system: "ecliptic",
    reference: meanEclipticOfDate,
  }) as const;

describe("referencesEqual", () => {
  it("matches identical references", () => {
    expect(referencesEqual(meanEclipticOfDate, meanEclipticOfDate)).toBe(true);
  });

  it("matches mean-ecliptic and mean-equatorial (same Reference, different System)", () => {
    expect(referencesEqual(meanEclipticOfDate, meanEquatorialOfDate)).toBe(true);
  });

  it("rejects j2000 vs mean-of-date", () => {
    expect(referencesEqual(eclipticJ2000, meanEclipticOfDate)).toBe(false);
  });

  it("rejects mean vs true-of-date", () => {
    expect(referencesEqual(meanEclipticOfDate, trueEclipticOfDate)).toBe(false);
  });
});

describe("assertSameReference", () => {
  it("passes when matching (returns void)", () => {
    expect(() => assertSameReference(meanEclipticOfDate, meanEquatorialOfDate)).not.toThrow();
  });

  it("throws FrameMismatchError on mismatch", () => {
    expect(() =>
      assertSameReference(meanEclipticOfDate, trueEclipticOfDate)
    ).toThrow(FrameMismatchError);
  });
});

describe("toCartesian / toSpherical", () => {
  it("round-trips a cartesian position", () => {
    const sph = toSpherical(cartPos(new Vec3(3, 4, 5)));
    expect(sph.representation.kind).toBe("spherical");
    expect(sph.origin).toBe("earth");
    expect(sph.system).toBe("ecliptic");
    expect(sph.reference).toEqual(meanEclipticOfDate);

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

const frame = meanEclipticOfDate;

const earthAtSun = {
  representation: { kind: "cartesian", vec3: new Vec3(1, 0, 0) },
  origin: "sun",
  system: "ecliptic",
  reference: frame,
} as const;

const moonAtEarth = {
  representation: { kind: "cartesian", vec3: new Vec3(0.00257, 0.001, 0) },
  origin: "earth",
  system: "ecliptic",
  reference: frame,
} as const;

const sunAtSun = {
  representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
  origin: "sun",
  system: "ecliptic",
  reference: frame,
} as const;

const homeEarth = {
  representation: { kind: "cartesian", vec3: new Vec3(0, 0, 0) },
  origin: "earth",
  system: "ecliptic",
  reference: frame,
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
      system: "ecliptic",
      reference: frame,
    } as const;
    const resolver = createResolver({
      sun: sunAtBarycenter,
      earth: earthAtSun,
      moon: moonAtEarth,
    });
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

  it("throws FrameMismatchError when an edge reference differs", () => {
    const other = { ...earthAtSun, reference: trueEclipticOfDate } as const;
    expect(() => createResolver({ earth: other })).toThrow(FrameMismatchError);
  });
});

describe("toOrigin", () => {
  it("moves the sun to the earth origin (geocentric sun)", () => {
    const resolver = createResolver({ earth: earthAtSun });
    const moved = toOrigin(sunAtSun, "earth", resolver);
    expect(moved.origin).toBe("earth");
    expect(moved.representation.kind).toBe("cartesian");
    expect(
      (moved.representation as { kind: "cartesian"; vec3: Vec3 }).vec3.x
    ).toBeCloseTo(-1);
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

import type {
  BodyConfig,
  MultiCoordinateBodyConfig,
  MultiCoordinateOutput,
} from "../../../src/types.js";

const eclipticOut: BodyConfig = {
  outputType: "ECLIPTIC",
  origin: "earth",
  system: "ecliptic",
  reference: meanEclipticOfDate,
  formula: () => ({ l: 10, b: 0, r: 1 }),
  distanceUnit: "au",
};

describe("toPosition", () => {
  it("wraps raw spherical output into a km-canonical cartesian Position", () => {
    const pos = toPosition({ l: 10, b: 0, r: 1 }, eclipticOut);
    expect(pos.origin).toBe("earth");
    expect(pos.system).toBe("ecliptic");
    expect(pos.reference).toEqual(meanEclipticOfDate);
    expect(pos.representation.kind).toBe("cartesian");
    const cos10 = Math.cos((10 * Math.PI) / 180);
    const sin10 = Math.sin((10 * Math.PI) / 180);
    const vec = (pos.representation as { kind: "cartesian"; vec3: Vec3 }).vec3;
    expect(vec.x).toBeCloseTo(AU_KM * cos10);
    expect(vec.y).toBeCloseTo(AU_KM * (cos10 === 0 ? 1 : sin10));
    expect(vec.z).toBeCloseTo(0);
  });
});

const multiConfig: MultiCoordinateBodyConfig = {
  outputType: "MULTI_SPHERICAL",
  origin: "earth",
  distanceUnit: "au",
  formula: () => ({
    r: 1,
    primary: {
      system: "ecliptic",
      reference: meanEclipticOfDate,
    },
    coordinates: [
      {
        system: "ecliptic",
        reference: meanEclipticOfDate,
        longitude: 10,
        latitude: 1,
      },
      {
        system: "equatorial",
        reference: trueEquatorialOfDate,
        longitude: 42,
        latitude: -7,
      },
    ],
  }),
};

describe("normalizeBodyOutput", () => {
  it("preserves every native coordinate entry and selects the declared primary", () => {
    const output = multiConfig.formula({ jd: 2451545 }) as MultiCoordinateOutput;
    const normalized = normalizeBodyOutput(output, multiConfig);

    expect(normalized.native).toHaveLength(2);
    expect(normalized.primary.system).toBe("ecliptic");
    expect(normalized.primary.reference).toEqual(meanEclipticOfDate);
    expect(toPosition(output, multiConfig)).toEqual(normalized.primary);
    expect(normalized.native[1]!.system).toBe("equatorial");
    expect(normalized.native[1]!.reference).toEqual(trueEquatorialOfDate);
  });

  it("rejects a primary key missing from coordinates", () => {
    const output = multiConfig.formula({ jd: 2451545 }) as MultiCoordinateOutput;
    expect(() =>
      normalizeBodyOutput(
        {
          ...output,
          primary: {
            system: "equatorial",
            reference: meanEclipticOfDate,
          },
        },
        multiConfig,
      ),
    ).toThrow(/primary.*coordinates/i);
  });

  it("rejects duplicate system/reference coordinate keys", () => {
    const output = multiConfig.formula({ jd: 2451545 }) as MultiCoordinateOutput;
    expect(() =>
      normalizeBodyOutput(
        {
          ...output,
          coordinates: [output.coordinates[0]!, output.coordinates[0]!],
        },
        multiConfig,
      ),
    ).toThrow(/duplicate native coordinates/i);
  });

  it("normalizes legacy output to one primary/native position", () => {
    const output = eclipticOut.formula({ jd: 2451545 });
    const normalized = normalizeBodyOutput(output, eclipticOut);
    expect(normalized.native).toEqual([normalized.primary]);
  });
});

describe("toKm canonical units", () => {
  it("is the identity for kilometres", () => {
    expect(toKm(384400, "km")).toBe(384400);
  });

  it("converts au and earth-radii to the same kilometres", () => {
    expect(toKm(1, "au")).toBeCloseTo(AU_KM);
    expect(toKm(1, "earth-radii")).toBeCloseTo(EARTH_RADIUS_KM);
  });

  it("converts the same physical vector identically in every unit", () => {
    const km = toKm(149597870.7, "km");
    const au = toKm(1, "au");
    const radii = toKm(149597870.7 / EARTH_RADIUS_KM, "earth-radii");
    expect(au).toBeCloseTo(km, 6);
    expect(radii).toBeCloseTo(km, 6);
  });

  it("throws on an unknown unit instead of passing through", () => {
    expect(() => toKm(1, "miles" as never)).toThrow(UnsupportedDistanceUnitError);
    expect(() => toKm(1, undefined as never)).toThrow(UnsupportedDistanceUnitError);
  });

  it("throws when an algorithm publishes an unknown distance unit", () => {
    const bad: BodyConfig = {
      ...eclipticOut,
      distanceUnit: "miles" as never,
    };
    expect(() => toPosition({ l: 10, b: 0, r: 1 }, bad)).toThrow(
      UnsupportedDistanceUnitError,
    );
  });
});