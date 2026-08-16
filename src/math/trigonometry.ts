import { normalizeAngle } from "./unit.js";

const degToRad = (deg: number) => (Math.PI * deg) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

export const sin = (x: number) => Math.sin(degToRad(normalizeAngle(x)));
export const cos = (x: number) => Math.cos(degToRad(normalizeAngle(x)));
export const tan = (x: number) => Math.tan(degToRad(normalizeAngle(x)));

export const cot = (x: number) => 1 / Math.tan(degToRad(x));
export const sec = (x: number) => 1 / Math.cos(degToRad(x));
export const csc = (x: number) => 1 / Math.sin(degToRad(x));

export const asin = (x: number) => radToDeg(Math.asin(x));
export const acos = (x: number) => radToDeg(Math.acos(x));
export const atan = (x: number) => radToDeg(Math.atan(x));
export const atan2 = (y: number, x: number) => radToDeg(Math.atan2(y, x));
export const acot = (x: number) => radToDeg(Math.atan(1 / x));
export const asec = (x: number) => radToDeg(Math.acos(1 / x));
export const acsc = (x: number) => radToDeg(Math.asin(1 / x));
