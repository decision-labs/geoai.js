type MultiPolygonGeometry = GeoJSON.MultiPolygon;

const POINT_BUFFER_DEGREES = 0.00001;

export function normalizeGeometryForDatabase(
  geometry: GeoJSON.Geometry
): MultiPolygonGeometry | null {
  if (geometry.type === 'MultiPolygon') {
    return geometry;
  }

  if (geometry.type === 'Polygon') {
    return {
      type: 'MultiPolygon',
      coordinates: [geometry.coordinates],
    };
  }

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    const ring: GeoJSON.Position[] = [
      [lng - POINT_BUFFER_DEGREES, lat - POINT_BUFFER_DEGREES],
      [lng + POINT_BUFFER_DEGREES, lat - POINT_BUFFER_DEGREES],
      [lng + POINT_BUFFER_DEGREES, lat + POINT_BUFFER_DEGREES],
      [lng - POINT_BUFFER_DEGREES, lat + POINT_BUFFER_DEGREES],
      [lng - POINT_BUFFER_DEGREES, lat - POINT_BUFFER_DEGREES],
    ];

    return {
      type: 'MultiPolygon',
      coordinates: [[ring]],
    };
  }

  return null;
}
