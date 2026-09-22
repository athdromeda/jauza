import type { TimeOptions } from "../types.js";

export type CallableConstructor<
  C extends abstract new (...args: any[]) => any,
> = C & ((...args: ConstructorParameters<C>) => InstanceType<C>);

/**
 * Makes a class constructable both with and without `new`, by returning a
 * Proxy whose only trap redirects a plain call to `Reflect.construct`. The
 * construct path is left untouched, so `new`, `extends`, statics, and
 * `instanceof` keep working, and the returned instance is a real object (so
 * `#private` fields are valid).
 *
 * Caveat: the returned proxy is a distinct value from the wrapped class, so
 * `instance.constructor` points at the raw class and, after bundling, `.name`
 * may be the bundler-mangled target name. Prefer `instanceof` over
 * `constructor` identity.
 */
export function callable<C extends abstract new (...args: any[]) => any>(
  ctor: C
): CallableConstructor<C> {
  return new Proxy(ctor, {
    apply: (target, _thisArg, args) => Reflect.construct(target, args),
  }) as CallableConstructor<C>;
}

export type TimeCallSignatures<T> = ((jd: number) => T) &
  ((jd: number, options?: TimeOptions) => T) &
  ((date: Date) => T) &
  ((date: Date, options?: TimeOptions) => T) &
  ((year: number, month: number, day: number, options?: TimeOptions) => T) &
  ((year: number, month: number, day: number, hour: number, options?: TimeOptions) => T) &
  ((
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    options?: TimeOptions
  ) => T) &
  ((
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    options?: TimeOptions
  ) => T);
