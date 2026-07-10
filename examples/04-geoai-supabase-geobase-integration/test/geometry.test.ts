import { describe, expect, it } from 'vitest';
import { normalizeGeometryForDatabase } from '../src/utils/geometry';

describe('normalizeGeometryForDatabase', () => {
  it('wraps polygons as multipolygons', () => {
    const geometry = normalizeGeometryForDatabase({
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    });

    expect(geometry?.type).toBe('MultiPolygon');
    expect(geometry?.coordinates).toHaveLength(1);
  });

  it('buffers points into multipolygons', () => {
    const geometry = normalizeGeometryForDatabase({
      type: 'Point',
      coordinates: [10, 20],
    });

    expect(geometry?.type).toBe('MultiPolygon');
    expect(geometry?.coordinates[0][0]).toHaveLength(5);
  });
});
