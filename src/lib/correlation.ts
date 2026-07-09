export interface Point {
  x: number;
  y: number;
  label: string;
}

export interface CorrelationResult {
  points: Point[];
  r: number;
  slope: number;
  intercept: number;
  n: number;
}

export function computeCorrelation(points: Point[]): CorrelationResult {
  const n = points.length;
  const nan: CorrelationResult = { points, r: NaN, slope: NaN, intercept: NaN, n };
  if (n < 2) return nan;

  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mx = sx / n;
  const my = sy / n;

  let sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0 || syy === 0) return nan;

  const r = sxy / Math.sqrt(sxx * syy);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return { points, r, slope, intercept, n };
}
