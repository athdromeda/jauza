import { atan2, tan, sin, asin, cos } from './angle';

function convertEclipticToEquator(lambda, beta, epsilon = 23.44) {
  const alpha = atan2(
    (sin(lambda) * cos(epsilon) - tan(beta) * sin(epsilon)) / cos(lambda)
  );
  const delta = asin(
    sin(beta) * cos(epsilon) + cos(beta) * sin(epsilon) * sin(lambda)
  );

  return { alpha, delta };
}

function convertEquatorToEcliptic(alpha, delta, epsilon = 23.44) {
  const lambda = atan2(
    (sin(alpha) * cos(epsilon) + tan(delta) * sin(epsilon)) / cos(alpha)
  );
  const beta = asin(
    sin(delta) * cos(epsilon) + cos(delta) * sin(epsilon) * sin(alpha)
  );

  return { lambda, beta };
}

function convertEquatorToHorizon(HA, delta, lat) {
  const h = asin(sin(lat) * sin(delta) + cos(lat) * cos(delta) * cos(HA));
  const A = atan2(sin(HA) / (cos(HA) * sin(lat) - tan(delta) * cos(lat))) - 180;

  return { h, A };
}

function convertHorizonToEquator(h, A, lat) {
  const As = A + 180;
  const HA = atan2(sin(As) / (cos(As) * sin(lat) + tan(h) * cos(lat)));
  const delta = asin(sin(lat) * sin(h) - cos(lat) * cos(h) * cos(As));

  return { HA, delta };
}

export {
  convertEclipticToEquator,
  convertEquatorToEcliptic,
  convertEquatorToHorizon,
  convertHorizonToEquator
};
