import maplibregl from "./maplibre-gl.js";
import { callPipeline, initializePipeline } from "./pipeline.js";

const geobaseConfig = document.querySelector("config").dataset;

const map = new maplibregl.Map({
  container: "map", // container id
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      "raster-tiles": {
        type: "raster",
        tiles: [
          `https://${geobaseConfig.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${geobaseConfig.cogImagery}&apikey=${geobaseConfig.apikey}`,
        ],
        tileSize: 256,
        attribution:
          'Data &copy; <a href="https://openaerialmap.org/" target="_blank">OpenAerialMap</a> contributors',
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "simple-tiles",
        type: "raster",
        source: "raster-tiles",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
  center: [114.85100984573364, -3.435287336176773], // starting position
  zoom: 18, // starting zoom
});

// const task = "zero-shot-object-detection";
// const task = "object-detection";
const task = "mask-generation";

let polygon = {
  type: "Feature",
  properties: {
    name: "area of interest",
  },
  geometry: {
    type: "Polygon",
    coordinates: [[]],
  },
};

// const label = ["tree."];

map.on("load", async () => {
  const boundsResponse = await fetch(
    `https://${geobaseConfig.projectRef}.geobase.app/titiler/v1/cog/bounds?url=${encodeURIComponent(geobaseConfig.cogImagery)}&apikey=${geobaseConfig.apikey}`
  );
  const boundsData = await boundsResponse.json();
  const bounds = new maplibregl.LngLatBounds(
    [boundsData.bounds[0], boundsData.bounds[1]],
    [boundsData.bounds[2], boundsData.bounds[3]]
  );

  // Create polygon coordinates from bounds
  // polygon.geometry.coordinates = [
  //   [
  //     [bounds.getWest(), bounds.getNorth()], // top left
  //     [bounds.getEast(), bounds.getNorth()], // top right
  //     [bounds.getEast(), bounds.getSouth()], // bottom right
  //     [bounds.getWest(), bounds.getSouth()], // bottom left
  //     [bounds.getWest(), bounds.getNorth()], // close the polygon by repeating first point
  //   ],
  // ];

  // console.log(JSON.stringify(polygon, null, 2));

  polygon = {
    type: "Feature",
    properties: {
      name: "area of interest",
    },
    geometry: {
      coordinates: [
        [
          [114.84807353432808, -3.449255329675921],
          [114.84807353432808, -3.4502955104658923],
          [114.84870049348092, -3.4502955104658923],
          [114.84870049348092, -3.449255329675921],
          [114.84807353432808, -3.449255329675921],
        ],
      ],
      type: "Polygon",
    },
  };

  let point = {
    type: "Feature",
    properties: {
      name: "input point",
    },
    geometry: {
      coordinates: [114.84866438996494, -3.449790763843808],
      type: "Point",
    },
  };

  // Fit the map to the image bounds
  map.fitBounds(bounds, {
    padding: 50,
    duration: 1000,
  });

  // Add the input polygon source
  map.addSource("input-polygon", {
    type: "geojson",
    data: polygon,
  });

  //Add the input point source
  if (task === "mask-generation") {
    map.addSource("input-point", {
      type: "geojson",
      data: point,
    });
  }
  // Add a fill layer for the input polygon
  map.addLayer({
    id: "input-polygon-fill",
    type: "fill",
    source: "input-polygon",
    paint: {
      "fill-color": "#0080ff", // Blue color
      "fill-opacity": 0.1,
    },
  });

  // Add an outline layer for the input polygon
  map.addLayer({
    id: "input-polygon-outline",
    type: "line",
    source: "input-polygon",
    paint: {
      "line-color": "#0080ff",
      "line-width": 2,
      "line-dasharray": [2, 2], // Optional: creates a dashed line
    },
  });

  if (task === "mask-generation") {
    // Add a marker for the input point
    new maplibregl.Marker().setLngLat(point.geometry.coordinates).addTo(map);
  }

  console.log("map loaded");
  const instance_id = await initializePipeline(task, geobaseConfig);
  console.log(instance_id);
  const output = await callPipeline(task, instance_id, {
    polygon,
    // label: ["building ."], //for zero-shot-object-detection,
    input_points: point.geometry.coordinates, // for mask-generation
  });
  console.log(output);

  // Add the GeoJSON source
  map.addSource("detected-objects", {
    type: "geojson",
    data: output, // Your GeoJSON data
  });

  // Add a fill layer to show the polygons
  map.addLayer({
    id: "detected-objects-fill",
    type: "fill",
    source: "detected-objects",
    paint: {
      "fill-color": "#ff0000", // Red color
      "fill-opacity": 0.3,
    },
  });

  // Add an outline layer to show the boundaries
  map.addLayer({
    id: "detected-objects-outline",
    type: "line",
    source: "detected-objects",
    paint: {
      "line-color": "#ff0000",
      "line-width": 2,
    },
  });

  // Optional: Add popup on click
  map.on("click", "detected-objects-fill", e => {
    if (!e.features.length) return;

    const feature = e.features[0];
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(
        `
        <strong>Label:</strong> ${feature.properties.label}<br>
        <strong>Score:</strong> ${(feature.properties.score * 100).toFixed(2)}%
      `
      )
      .addTo(map);
  });

  // Optional: Change cursor to pointer when hovering over detected objects
  map.on("mouseenter", "detected-objects-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "detected-objects-fill", () => {
    map.getCanvas().style.cursor = "";
  });
});
