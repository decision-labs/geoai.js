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

// Define a variable to store the pipeline instance ID
let instance_id;
// Define a variable to store the marker
let pointMarker;
// Track if we're currently processing to prevent multiple simultaneous calls
let isProcessing = false;

// Define point as a global variable
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

map.on("load", async () => {
  const boundsResponse = await fetch(
    `https://${geobaseConfig.projectRef}.geobase.app/titiler/v1/cog/bounds?url=${encodeURIComponent(geobaseConfig.cogImagery)}&apikey=${geobaseConfig.apikey}`
  );
  const boundsData = await boundsResponse.json();
  const bounds = new maplibregl.LngLatBounds(
    [boundsData.bounds[0], boundsData.bounds[1]],
    [boundsData.bounds[2], boundsData.bounds[3]]
  );

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

  // Add the input point source
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
    pointMarker = new maplibregl.Marker()
      .setLngLat(point.geometry.coordinates)
      .addTo(map);

    // Show loading indicator with initial position message
    const loadingElement = document.createElement("div");
    loadingElement.id = "loading-indicator";
    loadingElement.innerHTML =
      "Click anywhere in the polygon to set a new analysis point";
    loadingElement.style.position = "absolute";
    loadingElement.style.top = "10px";
    loadingElement.style.left = "10px";
    loadingElement.style.backgroundColor = "white";
    loadingElement.style.padding = "10px";
    loadingElement.style.borderRadius = "4px";
    loadingElement.style.zIndex = "1000";
    document.body.appendChild(loadingElement);
  }

  // Initialize the segmentation pipeline
  console.log("Initializing pipeline...");
  instance_id = await initializePipeline(task, geobaseConfig);
  console.log("Pipeline initialized:", instance_id);

  // Run the initial segmentation
  switch (task) {
    case "mask-generation":
      await runSegmentation();
      break;
    case "zero-shot-object-detection":
    case "object-detection":
      await runObjectDetection();
      break;
    default:
      throw new Error(`Unknown task: ${task}`);
  }

  // Add click event listener to update the point and re-run segmentation
  if (task === "mask-generation") {
    map.on("click", async e => {
      // Check if the click is within the polygon
      const point = map.queryRenderedFeatures(e.point, {
        layers: ["input-polygon-fill"],
      });
      if (point.length > 0) {
        updatePoint(e.lngLat);
      }
    });
  }

  // Add detected objects source and layers (will be populated after segmentation)
  map.addSource("detected-objects", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
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
        <strong>Label:</strong> ${feature.properties.label || "Segment"}<br>
        <strong>Score:</strong> ${feature.properties.score ? (feature.properties.score * 100).toFixed(2) + "%" : "N/A"}
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

// Function to update the point and trigger a new segmentation
function updatePoint(lngLat) {
  if (isProcessing) {
    console.log("Already processing, please wait...");
    return;
  }

  // Update the point coordinates
  point.geometry.coordinates = [lngLat.lng, lngLat.lat];

  // Update the marker position
  pointMarker.setLngLat(point.geometry.coordinates);

  // Update the source data
  if (map.getSource("input-point")) {
    map.getSource("input-point").setData(point);
  }

  // Run segmentation with new point
  runSegmentation();
}

// Function to run the segmentation with the current point
async function runSegmentation() {
  if (!instance_id || isProcessing) return;

  isProcessing = true;

  // Update loading indicator
  const loadingElement = document.getElementById("loading-indicator");
  if (loadingElement) {
    loadingElement.innerHTML = "Processing segmentation...";
  }

  try {
    const output = await callPipeline(task, instance_id, {
      polygon,
      input_points: point.geometry.coordinates, // for mask-generation
    });

    console.log("Segmentation result:", output);

    // Update the map with new results
    if (map.getSource("detected-objects")) {
      map.getSource("detected-objects").setData(output);
    }

    // Update loading indicator
    if (loadingElement) {
      loadingElement.innerHTML =
        "Click anywhere in the polygon to set a new analysis point";
    }
  } catch (error) {
    console.error("Error during segmentation:", error);

    // Update loading indicator with error
    if (loadingElement) {
      loadingElement.innerHTML =
        "Error during segmentation. Click again to retry.";
    }
  } finally {
    isProcessing = false;
  }
}

async function runObjectDetection() {
  if (!instance_id || isProcessing) return;

  isProcessing = true;

  try {
    const output = await callPipeline(task, instance_id, {
      polygon,
    });

    console.log("Object detection result:", output);

    // Update the map with new results
    console.log(map.getSource("detected-objects"));
    if (map.getSource("detected-objects")) {
      map.getSource("detected-objects").setData(output);
    } else {
      // add the source
      map.addSource("detected-objects-1", {
        type: "geojson",
        data: output,
      });
      map.addLayer({
        id: "detected-objects-1-fill",
        type: "fill",
        source: "detected-objects-1",
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.3,
        },
      });
    }
  } catch (error) {
    console.error("Error during object detection:", error);
  } finally {
    isProcessing = false;
  }
}
