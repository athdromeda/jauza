export const getAngleBetweenVectors = (
  v1: [number, number, number],
  v2: [number, number, number]
) => {
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
  return Math.acos(dot / (mag1 * mag2));
};

export const getXDistance = (
  v1: [number, number, number],
  v2: [number, number, number]
) => {
  const dx = v1[0] - v2[0];
  const dy = v1[1] - v2[1];
  return Math.sqrt(dx * dx + dy * dy);
};

export const getYDistance = (
  v1: [number, number, number],
  v2: [number, number, number]
) => {
  const dz = v1[2] - v2[2];
  return Math.abs(dz);
};

export const eclipticToXyz = (
  ecliptic: [number, number, number]
): [number, number, number] => {
  const [l, b, r] = ecliptic;
  const x = r * Math.cos(b) * Math.cos(l);
  const y = r * Math.cos(b) * Math.sin(l);
  const z = r * Math.sin(b);
  return [x, y, z];
};
