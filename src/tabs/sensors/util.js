// Rolling sample window shared by every sensor graph - matches the legacy
// tab's 300-sample history.
export const WINDOW = 300;

export function makeBuffer(count) {
  return Array.from({ length: count }, () => ({ points: [], min: -1, max: 1 }));
}

// Returns a new buffer (new points arrays/objects) with `values` appended at
// `index` - never mutates in place, so components that read a buffer as a
// prop always see the update.
export function pushSample(buffer, index, values) {
  return buffer.map((series, i) => {
    const value = values[i];
    const points =
      series.points.length >= WINDOW
        ? [...series.points.slice(1), [index, value]]
        : [...series.points, [index, value]];

    return {
      points,
      min: Math.min(series.min, value),
      max: Math.max(series.max, value),
    };
  });
}

// Combined min/max across every series in a buffer, for graphs whose y-axis
// auto-fits the data (altitude/sonar/debug) rather than using a fixed scale.
export function dynamicDomain(buffer) {
  let min = Infinity;
  let max = -Infinity;
  for (const series of buffer) {
    if (series.min < min) min = series.min;
    if (series.max > max) max = series.max;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return [min, max];
}

// Roll/pitch angles computed from the raw accelerometer vector, ported
// verbatim from the legacy tab's inline calculation.
export function accelAngles(x, y, z) {
  const roll = Math.round(
    Math.atan(y / (Math.sqrt(Math.pow(x, 2)) + Math.pow(z, 2))) * (180 / Math.PI),
  );
  const pitch = Math.round(
    Math.atan(x / (Math.sqrt(Math.pow(y, 2)) + Math.pow(z, 2))) * (180 / Math.PI),
  );
  return { roll, pitch };
}
