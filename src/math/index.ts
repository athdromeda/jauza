import { callable } from "../utils/callable.js";
import { DMS as DMSClass, HMS as HMSClass } from "../modules/angle.js";

export * from "./trigonometry.js";
export * from "./unit.js";
export * from "./astrometry.js";
export * from "./numerics.js";
export { Vec3 } from "../modules/vec3.js";

export type DMS = DMSClass;
export const DMS = callable(DMSClass);

export type HMS = HMSClass;
export const HMS = callable(HMSClass);
