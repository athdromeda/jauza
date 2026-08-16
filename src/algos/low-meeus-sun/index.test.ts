import { describe, it, expect } from "vitest";
import { Earth } from "../../modules/earth.js";
import { Time } from "../../modules/time.js";
import { Sun } from "../../modules/sun.js";
import { meeusLow } from "./index.js";

describe("low-meeus-sun", () => {
  it("should calculate sun position", () => {
    const jakarta = new Earth([-6, 10], [106, 51], 0);
    const observationTime = new Time(2009, 7, 1, 3);

    const observer = jakarta.at(observationTime).with(meeusLow);
    const sun = observer.observe(Sun);
    console.log("sun", sun.info);
    console.log("lambda", sun.lambda.decimal);
    console.log("beta", sun.beta.decimal);
    console.log("ra", sun.ra.decimal);
    console.log("dec", sun.dec.decimal);
    console.log("alt", sun.alt);
    console.log("az", sun.az);
    expect(sun.info).toBeDefined();
  });
});
