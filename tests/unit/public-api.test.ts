import { describe, expect, expectTypeOf, test } from "vitest";
import {
  Angle,
  Earth,
  GregorianCalendar,
  HijriCalendar,
  JulianCalendar,
  Moon,
  Qibla,
  Rukyat,
  Salat,
  Sun,
  Time,
  vincenty,
} from "../../src/index.js";
import { DMS, HMS } from "../../src/math/index.js";

describe("Time family is callable without new", () => {
  test("Time(jd)", () => {
    const t = Time(2451545);
    expect(t).toBeInstanceOf(Time);
    expect(t.jd).toBe(2451545);
  });

  test("Time(year, month, day)", () => {
    const t = Time(2024, 1, 1);
    expect(t).toBeInstanceOf(Time);
    expect(t.year).toBe(2024);
  });

  test("Time(Date)", () => {
    const t = Time(new Date(Date.UTC(2024, 0, 1)));
    expect(t.year).toBe(2024);
  });

  test("new Time(...) still works", () => {
    const t = new Time(2024, 1, 1);
    expect(t.year).toBe(2024);
  });

  test("static now() is preserved", () => {
    expect(Time.now()).toBeInstanceOf(Time);
  });

  test("calendars are callable, constructable, and instanceof Time", () => {
    const g = GregorianCalendar(2024, 1, 1);
    expect(g).toBeInstanceOf(GregorianCalendar);
    expect(g).toBeInstanceOf(Time);
    expect(g.toHijri()).toBeInstanceOf(HijriCalendar);
    expect(new GregorianCalendar(2024, 1, 1)).toBeInstanceOf(Time);

    const h = HijriCalendar(1445, 1, 1);
    expect(h).toBeInstanceOf(Time);
    expect(new HijriCalendar(1445, 1, 1)).toBeInstanceOf(Time);

    const j = JulianCalendar(2024, 1, 1);
    expect(j).toBeInstanceOf(Time);
    expect(new JulianCalendar(2024, 1, 1)).toBeInstanceOf(Time);
  });
});

describe("root domain modules are callable without new", () => {
  test("Earth, Sun, Moon (call and new)", () => {
    const e = Earth(-6.2, 106.8);
    expect(e).toBeInstanceOf(Earth);
    expect(new Earth(-6.2, 106.8)).toBeInstanceOf(Earth);

    const t = Time(2024, 1, 1);
    expect(Sun(t)).toBeInstanceOf(Sun);
    expect(new Sun(t)).toBeInstanceOf(Sun);
    expect(Moon(t)).toBeInstanceOf(Moon);
    expect(new Moon(t)).toBeInstanceOf(Moon);
  });

  test("Qibla fluent chain (call and new)", () => {
    const q = Qibla(-6.169777778, 106.8307333).with(vincenty);
    expect(q).toBeInstanceOf(Qibla);
    expect(q.qibla).toBeCloseTo(295.0165212, 6);
    expect(new Qibla(-6.169777778, 106.8307333)).toBeInstanceOf(Qibla);
  });

  test("Rukyat (call and new)", () => {
    const r = Rukyat(1445, 1);
    expect(r).toBeInstanceOf(Rukyat);
    expect(r.at(Earth(-6.2, 106.8))).toBe(r);
    expect(new Rukyat(1445, 1)).toBeInstanceOf(Rukyat);
  });

  test("Salat (call and new)", () => {
    const s = Salat(Time(2024, 1, 1), { timezone: 7 });
    expect(s).toBeInstanceOf(Salat);
    expect(s.at(Earth(-6.2, 106.8))).toBe(s);
    expect(new Salat(Time(2024, 1, 1), {})).toBeInstanceOf(Salat);
  });

  test("Angle and its statics (call and new)", () => {
    const a = Angle(45);
    expect(a).toBeInstanceOf(Angle);
    expect(a.decimal).toBe(45);
    expect(Angle.fromDMS(45, 0, 0)).toBeInstanceOf(Angle);
    expect(Angle.fromRadians(Math.PI / 4).decimal).toBeCloseTo(45, 9);
    expect(new Angle(45)).toBeInstanceOf(Angle);
  });
});

describe("math modules are callable without new", () => {
  test("DMS (call and new)", () => {
    const d = DMS(45, 30, 0);
    expect(d).toBeInstanceOf(DMS);
    expect(d.decimal).toBeCloseTo(45.5, 9);
    expect(new DMS(1)).toBeInstanceOf(DMS);
  });

  test("HMS (call and new)", () => {
    const h = HMS(12, 0, 0);
    expect(h).toBeInstanceOf(HMS);
    expect(h.decimal).toBeCloseTo(12, 9);
    expect(HMS(1).toDMS()).toBeInstanceOf(DMS);
    expect(new HMS(12)).toBeInstanceOf(HMS);
  });
});

describe("Time call overloads keep full type fidelity", () => {
  test("every constructor overload is mirrored on the call form", () => {
    expectTypeOf(Time(2451545)).toEqualTypeOf<Time>();
    expectTypeOf(Time(2451545, { timezone: 7 })).toEqualTypeOf<Time>();
    expectTypeOf(Time(new Date())).toEqualTypeOf<Time>();
    expectTypeOf(Time(new Date(), { timezone: 7 })).toEqualTypeOf<Time>();
    expectTypeOf(Time(2024, 1, 1)).toEqualTypeOf<Time>();
    expectTypeOf(Time(2024, 1, 1, { timezone: 7 })).toEqualTypeOf<Time>();
    expectTypeOf(Time(2024, 1, 1, 12)).toEqualTypeOf<Time>();
    expectTypeOf(Time(2024, 1, 1, 12, 30)).toEqualTypeOf<Time>();
    expectTypeOf(Time(2024, 1, 1, 12, 30, 15)).toEqualTypeOf<Time>();
    expectTypeOf(
      Time(2024, 1, 1, 12, 30, 15, { timezone: 7 })
    ).toEqualTypeOf<Time>();
    expectTypeOf(new Time(2024, 1, 1)).toEqualTypeOf<Time>();
  });

  test("invalid shapes are rejected at the call site", () => {
    // @ts-expect-error a string is not a valid Time argument
    Time("hello");
    // @ts-expect-error a seventh numeric argument is not a TimeOptions object
    Time(2024, 1, 1, 12, 30, 15, 42);
  });
});
