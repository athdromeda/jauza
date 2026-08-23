export function brent(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6,
  maxIter = 100
): number {
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    throw new Error(
      "brent: root is not bracketed (f(a) and f(b) must have opposite signs)"
    );
  }

  // ensure b is the best current bound
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }

  let c = a;
  let fc = fa;
  let d = a;
  let mflag = true;

  for (let i = 0; i < maxIter; i++) {
    const tolAct = 2 * Number.EPSILON * Math.abs(b) + tol;

    if (Math.abs(fb) <= tolAct || Math.abs(b - a) <= tolAct) {
      return b;
    }

    let s: number;
    if (fa !== fc && fb !== fc) {
      // iqi method
      s =
        (a * fb * fc) / ((fa - fb) * (fa - fc)) +
        (b * fa * fc) / ((fb - fa) * (fb - fc)) +
        (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      // secant method
      s = b - (fb * (b - a)) / (fb - fa);
    }

    const lower = (3 * a + b) / 4;
    const upper = b;
    const outsideBracket = (s < lower && s < upper) || (s > lower && s > upper);
    const stepTooLarge =
      (mflag && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
      (!mflag && Math.abs(s - b) >= Math.abs(c - d) / 2);
    const tooClose =
      (mflag && Math.abs(b - c) <= tolAct) ||
      (!mflag && Math.abs(c - d) <= tolAct);

    if (outsideBracket || stepTooLarge || tooClose) {
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }

    const fs = f(s);
    d = c;
    c = b;
    fc = fb;

    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }

  throw new Error("brent: did not converge within maxIter");
}
