import { describe, expect, test } from "vitest";
import { callable } from "./callable.js";

class Counter {
  #n: number;

  constructor(n: number) {
    this.#n = n;
  }

  get value() {
    return this.#n;
  }

  inc() {
    return this.value + 1;
  }

  static zero() {
    return new Counter(0);
  }
}

const Wrapped = callable(Counter);

describe("callable", () => {
  test("can be invoked without new", () => {
    const c = Wrapped(3);
    expect(c).toBeInstanceOf(Counter);
    expect(c.value).toBe(3);
  });

  test("still supports new", () => {
    const c = new Wrapped(4);
    expect(c).toBeInstanceOf(Wrapped);
    expect(c.value).toBe(4);
  });

  test("private fields work through methods", () => {
    expect(Wrapped(3).inc()).toBe(4);
  });

  test("static members are preserved", () => {
    expect(Wrapped.zero().value).toBe(0);
  });

  test("subclasses constructed with new stay instances", () => {
    class Sub extends Wrapped {}
    const s = new Sub(9);
    expect(s).toBeInstanceOf(Sub);
    expect(s).toBeInstanceOf(Counter);
    expect(s.value).toBe(9);
  });
});
