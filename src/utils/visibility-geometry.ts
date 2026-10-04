import { equatorialToHorizontal } from "../math/astrometry.js";
import { WGS84_A_KM } from "../math/topocentric.js";
import { acos, asin, cos, sin } from "../math/trigonometry.js";
import { normalizeHour } from "../math/unit.js";
import { Earth } from "../modules/earth.js";
import { Moon } from "../modules/moon.js";
import { Sun } from "../modules/sun.js";
import { Time } from "../modules/time.js";
import type { AlgoConfig } from "../types.js";

export type VisibilityGeometryInput = {
  time: Time;
  observer: Earth;
  sunAlgo: AlgoConfig;
  moonAlgo: AlgoConfig;
};

export type VisibilityGeometry = {
  time: Time;
  geocentric: {
    sunAltitudeDeg: number;
    moonAltitudeDeg: number;
    arcvDeg: number;
    arclDeg: number;
  };
  topocentric: {
    sunAltitudeDeg: number;
    moonAltitudeDeg: number;
    arcvDeg: number;
    arclDeg: number;
  };
  moon: {
    distanceKm: number;
    horizontalParallaxArcmin: number;
    geocentricSemiDiameterArcmin: number;
    topocentricSemiDiameterArcmin: number;
  };
  yallopWidthArcmin: number;
  odehWidthArcmin: number;
};

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

const separation = (
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
) =>
  acos(
    clampUnit(
      sin(lat1) * sin(lat2) + cos(lat1) * cos(lat2) * cos(lon1 - lon2)
    )
  );

/**
 * Best time `Tb = Ts + (4/9) Lag` (Yallop 1997 eq. 4.1; Odeh 2006 eq. 1).
 * Requires a non-negative lag (sunset before moonset).
 */
export function bestTime(sunset: Time, moonset: Time): Time {
  const lag = moonset.jd - sunset.jd;
  if (!Number.isFinite(lag) || lag < 0) {
    throw new RangeError(
      `Visibility best time requires non-negative lag; got ${lag}`
    );
  }
  return new Time(sunset.jd + (4 / 9) * lag, {
    timezone: sunset.timezone,
    scale: sunset.scale,
  });
}

/**
 * Geocentric altitude/azimuth: parallax-free horizontal coordinates derived
 * from the geocentric apparent true-of-date RA/Dec and local apparent sidereal
 * time. This is the "geocentric altitude of the Moon" used by Yallop.
 */
const geocentricHorizontal = (body: Earth) => {
  const lst = normalizeHour(body.time.gast + body.lng / 15);
  const hourAngle = lst * 15 - body.ra.decimal;
  return equatorialToHorizontal(
    { ra: body.ra, dec: body.dec },
    body.lat,
    hourAngle
  );
};

/**
 * Criterion geometry for Yallop (1997) and Odeh (2006) at a single time:
 * airless geocentric and topocentric arcs of vision/light, the real lunar
 * distance, semidiameters, and the two crescent widths.
 *
 * Yallop ARCV/ARCL are geocentric (only its width `W'` is topocentric); Odeh
 * ARCV/ARCL/width are all topocentric. Widths are arcminutes.
 */
export function computeVisibilityGeometry({
  time,
  observer,
  sunAlgo,
  moonAlgo,
}: VisibilityGeometryInput): VisibilityGeometry {
  const sun = new Earth(observer.lat, observer.lng, observer.h)
    .at(time)
    .observe(Sun)
    .with(sunAlgo);
  const moon = new Earth(observer.lat, observer.lng, observer.h)
    .at(time)
    .observe(Moon)
    .with(moonAlgo);

  const distanceKm = moon.geometric().rKm;
  if (!Number.isFinite(distanceKm) || distanceKm <= WGS84_A_KM) {
    throw new RangeError(
      `Visibility geometry requires lunar distance in km; got ${distanceKm}`
    );
  }

  const sunGeo = geocentricHorizontal(sun);
  const moonGeo = geocentricHorizontal(moon);
  const sunTopo = sun.horizontal;
  const moonTopo = moon.horizontal;

  const geocentricArclDeg = separation(
    sun.ra.decimal,
    sun.dec.decimal,
    moon.ra.decimal,
    moon.dec.decimal
  );
  const topocentricArclDeg = separation(
    sunTopo.az.decimal,
    sunTopo.alt.decimal,
    moonTopo.az.decimal,
    moonTopo.alt.decimal
  );

  const horizontalParallaxDeg = asin(WGS84_A_KM / distanceKm);
  const horizontalParallaxArcmin = horizontalParallaxDeg * 60;
  const geocentricSemiDiameterArcmin = 0.27245 * horizontalParallaxArcmin;
  const topocentricSemiDiameterArcmin =
    geocentricSemiDiameterArcmin *
    (1 + sin(moonGeo.alt.decimal) * sin(horizontalParallaxDeg));

  return {
    time,
    geocentric: {
      sunAltitudeDeg: sunGeo.alt.decimal,
      moonAltitudeDeg: moonGeo.alt.decimal,
      arcvDeg: moonGeo.alt.decimal - sunGeo.alt.decimal,
      arclDeg: geocentricArclDeg,
    },
    topocentric: {
      sunAltitudeDeg: sunTopo.alt.decimal,
      moonAltitudeDeg: moonTopo.alt.decimal,
      arcvDeg: moonTopo.alt.decimal - sunTopo.alt.decimal,
      arclDeg: topocentricArclDeg,
    },
    moon: {
      distanceKm,
      horizontalParallaxArcmin,
      geocentricSemiDiameterArcmin,
      topocentricSemiDiameterArcmin,
    },
    yallopWidthArcmin:
      topocentricSemiDiameterArcmin * (1 - cos(geocentricArclDeg)),
    odehWidthArcmin:
      topocentricSemiDiameterArcmin * (1 - cos(topocentricArclDeg)),
  };
}