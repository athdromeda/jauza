import { describe, expect, test } from "vitest";
import { Qibla } from "./qibla.js";
import { spherical, vincenty } from "../utils/qibla.js";

describe("Qibla direction", () => {
  test("should use the spherical method by default for Masjid Istiqlal", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
  });

  test("should use the vincenty method when configured with vincenty", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333).with(vincenty);
    expect(qibla.qibla).toBeCloseTo(295.0165212, 6);
  });

  test("should use the spherical method when configured with spherical", () => {
    const qibla = new Qibla(0, 0).with(spherical);
    expect(qibla.qibla).toBeCloseTo(58.5081754, 6);
  });

  test("with() should return the same instance", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.with(vincenty)).toBe(qibla);
  });

  test("with() should recompute after the value has been read", () => {
    const qibla = new Qibla(-6.169777778, 106.8307333);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
    expect(qibla.with(vincenty).qibla).toBeCloseTo(295.0165212, 6);
  });

  test("should honor positive and negative coordinate arrays", () => {
    const qibla = new Qibla([-6, 10, 11.2], [106, 49, 50.64]);
    expect(qibla.qibla).toBeCloseTo(295.1434579, 6);
  });

  test("should expose getQibla as a method", () => {
    const qibla = new Qibla(0, 0);
    expect(typeof qibla.getQibla).toBe("function");
  });
});