export interface EmbeddingFeatureProperties {
  patch_index?: number;
  embedding_norm?: number;
  similarities?: number[];
  embedding_vector?: number[];
  draw_similarity?: number;
  [key: string]: unknown;
}

export type EmbeddingFeature = GeoJSON.Feature<GeoJSON.Polygon, EmbeddingFeatureProperties>;

export const clampFinite = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    const av = clampFinite(a[i], 0);
    const bv = clampFinite(b[i], 0);
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export const cosineDistance = (a: number[], b: number[]): number => 1 - cosineSimilarity(a, b);

const getPolygonRing = (polygon: GeoJSON.Feature<GeoJSON.Polygon>): number[][] =>
  polygon.geometry.coordinates[0] || [];

const getRingBounds = (ring: number[][]): [number, number, number, number] | null => {
  if (ring.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  if (![minX, maxX, minY, maxY].every(Number.isFinite)) {
    return null;
  }

  return [minX, minY, maxX, maxY];
};

const boundsIntersect = (
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean => {
  const [aMinX, aMinY, aMaxX, aMaxY] = a;
  const [bMinX, bMinY, bMaxX, bMaxY] = b;
  return aMinX <= bMaxX && aMaxX >= bMinX && aMinY <= bMaxY && aMaxY >= bMinY;
};

export function isPointInPolygon(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const yiGt = yi > py;
    const yjGt = yj > py;
    if (yiGt === yjGt) continue;

    const xIntersect = ((xj - xi) * (py - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (px < xIntersect) inside = !inside;
  }

  return inside;
}

export function getPatchCenter(feature: EmbeddingFeature): [number, number] | null {
  const ring = feature.geometry.coordinates[0];
  if (!ring || ring.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  if (![minX, maxX, minY, maxY].every(Number.isFinite)) {
    return null;
  }

  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export function getCoveredEmbeddingFeatures(
  features: EmbeddingFeature[],
  polygon: GeoJSON.Feature<GeoJSON.Polygon>
): EmbeddingFeature[] {
  const ring = getPolygonRing(polygon);
  if (ring.length < 3) return [];
  const selectionBounds = getRingBounds(ring);

  return features.filter((feature) => {
    const center = getPatchCenter(feature);
    const patchRing = feature.geometry.coordinates[0] || [];
    const patchBounds = getRingBounds(patchRing);

    if (selectionBounds && patchBounds && boundsIntersect(selectionBounds, patchBounds)) {
      return true;
    }

    return center ? isPointInPolygon(center, ring) : false;
  });
}

export function buildMeanAnchorVector(features: EmbeddingFeature[]): number[] | null {
  if (features.length === 0) return null;

  const vectors = features
    .map((feature) => feature.properties?.embedding_vector)
    .filter((vector): vector is number[] => Array.isArray(vector) && vector.length > 0);

  if (vectors.length === 0) return null;

  const dim = vectors[0].length;
  if (dim === 0) return null;

  const sum = new Array<number>(dim).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dim; i += 1) {
      sum[i] += clampFinite(vector[i], 0);
    }
  }

  return sum.map((value) => value / vectors.length);
}

export function attachDrawSimilarities(
  collection: GeoJSON.FeatureCollection,
  polygon: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.FeatureCollection {
  const features = collection.features as EmbeddingFeature[];
  const coveredFeatures = getCoveredEmbeddingFeatures(features, polygon);
  const anchorVector = buildMeanAnchorVector(coveredFeatures);

  return {
    ...collection,
    features: collection.features.map((feature) => {
      const properties = { ...(feature.properties || {}) };
      if (!anchorVector || !Array.isArray(properties.embedding_vector)) {
        delete properties.draw_similarity;
      } else {
        properties.draw_similarity = cosineSimilarity(properties.embedding_vector, anchorVector);
      }

      return {
        ...feature,
        properties
      };
    })
  };
}
