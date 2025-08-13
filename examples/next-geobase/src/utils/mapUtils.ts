import maplibregl from 'maplibre-gl';

// Utility functions for handling map operations
export class MapUtils {
  static displayDetections(
    map: maplibregl.Map,
    detections: GeoJSON.FeatureCollection
  ) {
    if (!map) return;

    // Remove existing detection layer if it exists
    if (map.getSource("detections")) {
      map.removeLayer("detections-layer");
      map.removeSource("detections");
    }

    // Add the new detections as a source
    map.addSource("detections", {
      type: "geojson",
      data: detections,
    });

    // Add a layer to display the detections
    map.addLayer({
      id: "detections-layer",
      type: "fill",
      source: "detections",
      paint: {
        "fill-color": "#FF6B35", // Orange - highly visible and color-blind friendly
        "fill-opacity": 0.6,
        "fill-outline-color": "#CC5500", // Darker orange for better contrast
      },
    });

    // Add hover functionality
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("mouseenter", "detections-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "detections-layer", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("mousemove", "detections-layer", (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;

        // Create HTML content for popup
        const content = Object.entries(properties || {})
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join("<br/>");

        popup
          .setLngLat(e.lngLat)
          .setHTML(content)
          .addTo(map);
      }
    });
  }

  static displayInferenceBounds(
    map: maplibregl.Map,
    bounds: { north: number; south: number; east: number; west: number }
  ) {
    if (!map) return;

    // Remove existing inference bounds layer if it exists
    if (map.getSource("inference-bounds")) {
      map.removeLayer("inference-bounds-layer");
      map.removeSource("inference-bounds");
    }

    // Create a polygon from the bounds
    const boundsPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {
        type: "inference-area",
        description: "AI Inference Extraction Area"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [bounds.west, bounds.north],  // top-left
          [bounds.east, bounds.north],  // top-right
          [bounds.east, bounds.south],  // bottom-right
          [bounds.west, bounds.south],  // bottom-left
          [bounds.west, bounds.north]   // close polygon
        ]]
      }
    };

    // Add the inference bounds as a source
    map.addSource("inference-bounds", {
      type: "geojson",
      data: boundsPolygon,
    });

    // Add a layer to display the inference bounds (outline only)
    map.addLayer({
      id: "inference-bounds-layer",
      type: "line",
      source: "inference-bounds",
      paint: {
        "line-color": "#8B5CF6", // Purple - excellent contrast with orange and color-blind accessible
        "line-width": 3,
        "line-dasharray": [5, 3], // dashed line
        "line-opacity": 1.0,
      },
    });

    // Add hover functionality for bounds
    const boundsPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("mouseenter", "inference-bounds-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "inference-bounds-layer", () => {
      map.getCanvas().style.cursor = "";
      boundsPopup.remove();
    });

    map.on("mousemove", "inference-bounds-layer", (e) => {
      const content = `
        <div class="p-2">
          <strong class="text-purple-600">AI Inference Area</strong><br/>
          <small class="text-gray-600">Image extraction bounds</small><br/>
          <strong>North:</strong> ${bounds.north.toFixed(6)}<br/>
          <strong>South:</strong> ${bounds.south.toFixed(6)}<br/>
          <strong>East:</strong> ${bounds.east.toFixed(6)}<br/>
          <strong>West:</strong> ${bounds.west.toFixed(6)}
        </div>
      `;

      boundsPopup
        .setLngLat(e.lngLat)
        .setHTML(content)
        .addTo(map);
    });
  }

  static clearAllLayers(map: maplibregl.Map) {
    if (!map) return;

    // Remove detection layer if it exists
    if (map.getSource("detections")) {
      map.removeLayer("detections-layer");
      map.removeSource("detections");
    }

    // Remove inference bounds layer if it exists
    if (map.getSource("inference-bounds")) {
      map.removeLayer("inference-bounds-layer");
      map.removeSource("inference-bounds");
    }
  }

  static setZoom(map: maplibregl.Map, zoom: number) {
    if (map) {
      map.setZoom(zoom);
    }
  }
}
