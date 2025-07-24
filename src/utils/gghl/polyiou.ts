interface Point {
  x: number;
  y: number;
}

const eps = 1e-8;

/**
 * Determines the sign of a number.
 * @param d The number to check.
 * @returns 1 if positive, -1 if negative, 0 if zero.
 */
function sig(d: number): number {
  return d > eps ? 1 : d < -eps ? -1 : 0;
}

/**
 * Calculates the cross product of three points.
 * @param o The origin point.
 * @param a The first point.
 * @param b The second point.
 * @returns The cross product value.
 */
function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (b.x - o.x) * (a.y - o.y);
}

/**
 * Calculates the area of a polygon.
 * @param ps The polygon's vertices.
 * @param n The number of vertices.
 * @returns The area of the polygon.
 */
function area(ps: Point[], n: number): number {
  let res = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    res += ps[i].x * ps[j].y - ps[j].x * ps[i].y;
  }
  return Math.abs(res) / 2.0;
}

/**
 * Finds the intersection point of two lines.
 * @param a The first point of the first line.
 * @param b The second point of the first line.
 * @param c The first point of the second line.
 * @param d The second point of the second line.
 * @param p The intersection point (output).
 * @returns 1 if the lines intersect, 0 if parallel, 2 if collinear.
 */
function lineCross(a: Point, b: Point, c: Point, d: Point, p: Point): number {
  const s1 = cross(a, b, c);
  const s2 = cross(a, b, d);
  if (sig(s1) === 0 && sig(s2) === 0) return 2; // Collinear
  if (sig(s2 - s1) === 0) return 0; // Parallel
  p.x = (c.x * s2 - d.x * s1) / (s2 - s1);
  p.y = (c.y * s2 - d.y * s1) / (s2 - s1);
  return 1; // Intersection
}

/**
 * Cuts a polygon with a line and returns the resulting polygon.
 * @param p The polygon's vertices.
 * @param n The number of vertices.
 * @param a The first point of the cutting line.
 * @param b The second point of the cutting line.
 * @param pp The resulting polygon (output).
 */
function polygonCut(
  p: Point[],
  n: number,
  a: Point,
  b: Point,
  pp: Point[]
): void {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (sig(cross(a, b, p[i])) > 0) pp[m++] = p[i]; // Keep points on the left
    if (sig(cross(a, b, p[i])) !== sig(cross(a, b, p[j]))) {
      const intersection = { x: 0, y: 0 };
      lineCross(a, b, p[i], p[j], intersection);
      pp[m++] = intersection; // Add intersection point
    }
  }
  n = m;
  for (let i = 0; i < m; i++) {
    p[i] = pp[i]; // Copy back to original array
  }
}

/**
 * Calculates the intersection area of two polygons using the Sutherland-Hodgman algorithm.
 * @param ps1 The vertices of the first polygon.
 * @param n1 The number of vertices in the first polygon.
 * @param ps2 The vertices of the second polygon.
 * @param n2 The number of vertices in the second polygon.
 * @returns The intersection area.
 */
function intersectAreaPoly(
  ps1: Point[],
  n1: number,
  ps2: Point[],
  n2: number
): number {
  let clippedPolygon = ps1.slice();
  let clippedCount = n1;

  for (let i = 0; i < n2; i++) {
    const a = ps2[i];
    const b = ps2[(i + 1) % n2];
    const tempPolygon: Point[] = [];
    polygonCut(clippedPolygon, clippedCount, a, b, tempPolygon);
    clippedPolygon = tempPolygon;
    clippedCount = tempPolygon.length;
  }

  return area(clippedPolygon, clippedCount);
}

/**
 * Calculates the IoU of two polygons.
 * @param p The vertices of the first polygon.
 * @param q The vertices of the second polygon.
 * @returns The IoU value.
 */
export function iouPoly(p: number[], q: number[]): number {
  const ps1: Point[] = [];
  const ps2: Point[] = [];
  const n1 = 4;
  const n2 = 4;

  for (let i = 0; i < 4; i++) {
    ps1.push({ x: p[i * 2], y: p[i * 2 + 1] });
    ps2.push({ x: q[i * 2], y: q[i * 2 + 1] });
  }

  const interArea = intersectAreaPoly(ps1, n1, ps2, n2);

  const area1 = area(ps1, n1);
  const area2 = area(ps2, n2);
  const unionArea = area1 + area2 - interArea;
  // Handle edge cases (e.g., zero-area polygons)
  if (unionArea < 1e-6) {
    return 0;
  }

  const iou = interArea / unionArea;
  return iou;
}
