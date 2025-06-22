import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { MaplibreTerradrawControl } from "@watergis/maplibre-gl-terradraw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css";

const MapboxDrawComponent = ({ geojson }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [geoJson, setGeoJson] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current) {
      console.error("Map container reference is null");
      return;
    }

    // Initialize map
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        "https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
      center: [12.4828, 41.8854], // Set default center (Rome)
      zoom: 14,
    });

    mapRef.current = map;

    // Initialize draw control
    const draw = new MaplibreTerradrawControl.MaplibreTerradrawControl({
      modes: [
        "render",
        "point",
        "linestring",
        "polygon",
        "rectangle",
        "circle",
        "freehand",
        "angled-rectangle",
        "sensor",
        "sector",
        "select",
        "delete-selection",
        "delete",
      ],
      open: true,
    });

    drawRef.current = draw;
    map.addControl(draw, "top-right");

    // Update GeoJSON on draw events
    const updateGeoJson = () => {
      const data = draw.getAll();
      setGeoJson(data);
      console.log("Drawn data:", data);
    };

    map.on("draw.create", updateGeoJson);
    map.on("draw.delete", updateGeoJson);
    map.on("draw.update", updateGeoJson);

    // Adding custom bounding box layer
    map.on("load", () => {
      map.addLayer({
        id: "line-bounding-box",
        type: "line",
        paint: {
          color: "#3386c0",
          width: 3,
          opacity: 0.9,
        },
        source: {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [12.482802629103247, 41.885379230564524],
                  [12.481392196198271, 41.885379230564524],
                  [12.481392196198271, 41.884332326712524],
                  [12.482802629103247, 41.884332326712524],
                  [12.482802629103247, 41.885379230564524],
                ],
              ],
            },
          },
        },
      });

      if (geojson) {
        const data = JSON.parse(geojson);
        draw.set({ type: "FeatureCollection", features: data.features });
      }
    });

    map.on("click", e => {
      console.log("Clicked on map at:", e.lngLat);
    });

    map.on("error", e => {
      console.error("An error occurred with the map:", e);
    });

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [geojson]);

  return (
    <div style={{ display: "flex" }}>
      <div
        className="sidebar"
        style={{ width: "20%", padding: "10px", boxSizing: "border-box" }}
      >
        <h3>Drawn GeoJSON</h3>
        <pre>
          {geoJson ? JSON.stringify(geoJson, null, 2) : "No shapes drawn yet."}
        </pre>
      </div>
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ width: "80%" }}
      ></div>
    </div>
  );
};

export default MapboxDrawComponent;
