import { describe, it, expect } from "vitest";
import { Salat } from "./salat.js";
import { Time } from "./time.js";
import { Earth } from "./earth.js";
import { meeusLow } from "../algos/low-meeus-sun/index.js";
import { HMS } from "./angle.js";

describe("Salat", () => {
  it("should calculate salat times", () => {
    // 12 Juni 2009 di Jakarta (L = –6.166667 derajat, B = 106.85 derajat, Z = 7, H = 50 meter)

    const jakarta = new Earth(-6.166667, 106.85, 50);
    const salat = new Salat(new Time(2009, 6, 12, 12), {timezone: 7}).at(jakarta).with(meeusLow);

    // Shubuh pukul 4:35:51 WIB = pukul 4:36 WIB.
    // Terbit Matahari pukul 5:58:18 WIB = pukul 5:58 WIB.
    // Zhuhur pukul 11:54:26 WIB = pukul 11:55 WIB.
    // Ashar pukul 15:14:25 WIB = pukul 15:15 WIB.
    // Maghrib 17:46:33 WIB = pukul 17:47 WIB.
    // Isya' pukul 19:00:18 WIB = pukul 19:01 WIB.
    // Istiwa 11,87375 
    expect(salat.eot()).toBeCloseTo(0.175, 2);
    expect(salat.istiwa()).toBeCloseTo(11.87375, 2);
    expect(salat.fajr()).toBeCloseTo(new HMS(4, 35, 51).decimal, 2);
    expect(salat.sunrise()).toBeCloseTo(new HMS(5, 58, 18).decimal, 2);
    // expect(salat.dhuhr()).toBeCloseTo(new HMS(11, 54, 26).decimal, 2);
    expect(salat.asr()).toBeCloseTo(new HMS(15, 14, 25).decimal, 2);
    expect(salat.maghrib()).toBeCloseTo(new HMS(17, 46, 33).decimal, 2);
    expect(salat.isha()).toBeCloseTo(new HMS(19, 0, 18).decimal, 2);

    expect(salat).toBeDefined();
  });
});