import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { odeh, yallop } from "../../../src/utils/visibility.js";

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../validation/fixtures/crescent-visibility.json",
        import.meta.url
      )
    ),
    "utf8"
  )
) as {
  yallop: Array<{
    label: string;
    arcvDeg: number;
    widthArcmin: number;
    q: number;
    zone: "A" | "B" | "C" | "D" | "E" | "F";
  }>;
};

describe("Yallop 1997", () => {
  for (const row of fixtures.yallop) {
    it(row.label, () => {
      const result = yallop({
        arcvDeg: row.arcvDeg,
        crescentWidthArcmin: row.widthArcmin,
      });
      expect(result.q).toBeCloseTo(row.q, 2);
      expect(result.zone).toBe(row.zone);
    });
  }

  it.each([
    [0.2160001, "A"],
    [0.2159999, "B"],
    [-0.0139999, "B"],
    [-0.0140001, "C"],
    [-0.1599999, "C"],
    [-0.1600001, "D"],
    [-0.2319999, "D"],
    [-0.2320001, "E"],
    [-0.2929999, "E"],
    [-0.2930001, "F"],
  ] as const)("maps q=%s to zone %s", (q, zone) => {
    const result = yallop({
      arcvDeg: 11.8371 + 10 * q,
      crescentWidthArcmin: 0,
    });
    expect(result.zone).toBe(zone);
  });
});

describe("Odeh 2006", () => {
  it("implements equation 2 in degrees and arcminutes", () => {
    const result = odeh({ arcvDeg: 5, crescentWidthArcmin: 0.5 });
    expect(result.v).toBeCloseTo(0.82595, 5);
    expect(result.zone).toBe("C");
  });

  it.each([
    [5.6500001, "A"],
    [5.6499999, "B"],
    [2.0000001, "B"],
    [1.9999999, "C"],
    [-0.9599999, "C"],
    [-0.9600001, "D"],
  ] as const)("maps V=%s to zone %s", (v, zone) => {
    const result = odeh({
      arcvDeg: 7.1651 + v,
      crescentWidthArcmin: 0,
    });
    expect(result.zone).toBe(zone);
  });

  it("rejects non-finite input", () => {
    expect(() =>
      yallop({ arcvDeg: NaN, crescentWidthArcmin: 0.2 })
    ).toThrow(RangeError);
    expect(() =>
      odeh({ arcvDeg: 5, crescentWidthArcmin: Infinity })
    ).toThrow(RangeError);
  });
});