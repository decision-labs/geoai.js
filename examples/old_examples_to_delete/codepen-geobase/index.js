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
  center: [-99.09174002069761, 46.59496082832683], // starting position
  zoom: 18, // starting zoom
});

// const task = "zero-shot-object-detection";
// const task = "object-detection";
// const task = "mask-generation";
// const task = "oriented-object-detection";
// const task = "land-cover-classification";
// const task = "solar-panel-detection";
// const task = "ship-detection";
// const task = "car-detection";
// const task = "building-detection";
const task = "wetland-segmentation";

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
    coordinates: [-121.7741175795054, 38.553084201622795],
    type: "Point",
  },
};

map.on("load", async () => {
  const boundsResponse = await fetch(
    `https://${geobaseConfig.projectRef}.geobase.app/titiler/v1/cog/bounds?url=${encodeURIComponent(geobaseConfig.cogImagery)}&apikey=${geobaseConfig.apikey}`
  );
  const boundsData = await boundsResponse.json();
  console.log("boundsData:", { boundsData });
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
          [-99.10507239146537, 46.5974915809696],
          [-99.10507239146537, 46.58180703418273],
          [-99.08245294726746, 46.58180703418273],
          [-99.08245294726746, 46.5974915809696],
          [-99.10507239146537, 46.5974915809696],
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
    case "oriented-object-detection":
      await runOrientedObjectDetection();
      break;
    case "land-cover-classification":
      await runLandCoverClassification();
      break;
    case "solar-panel-detection":
    case "ship-detection":
    case "car-detection":
    case "building-detection":
    case "wetland-segmentation":
      await solarPanelDetection();
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

async function runOrientedObjectDetection() {
  if (!instance_id || isProcessing) return;

  isProcessing = true;

  // Add a loading indicator for oriented object detection
  const loadingElement =
    document.getElementById("loading-indicator") ||
    document.createElement("div");

  if (!document.getElementById("loading-indicator")) {
    loadingElement.id = "loading-indicator";
    loadingElement.style.position = "absolute";
    loadingElement.style.top = "10px";
    loadingElement.style.left = "10px";
    loadingElement.style.backgroundColor = "white";
    loadingElement.style.padding = "10px";
    loadingElement.style.borderRadius = "4px";
    loadingElement.style.zIndex = "1000";
    document.body.appendChild(loadingElement);
  }

  loadingElement.innerHTML = "Processing oriented object detection...";

  try {
    const output = await callPipeline(task, instance_id, {
      polygon,
    });

    console.log("Oriented object detection result:", output);

    // Verify that output is a valid GeoJSON
    if (!output || !output.type || !output.features) {
      console.error("Invalid GeoJSON output:", output);
      throw new Error("Invalid output format");
    }

    // Ensure we have the map and source before updating
    if (map && map.loaded()) {
      // Check if source exists
      if (map.getSource("detected-objects")) {
        console.log("Updating detected-objects source with new data");
        map.getSource("detected-objects").setData(output);
      } else {
        console.error("Source 'detected-objects' not found in map");
        // Create the source if it doesn't exist (fallback)
        if (!map.getSource("detected-objects")) {
          console.log("Adding missing source 'detected-objects'");
          map.addSource("detected-objects", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          // Add layers for this source if they don't exist
          if (!map.getLayer("detected-objects-fill")) {
            map.addLayer({
              id: "detected-objects-fill",
              type: "fill",
              source: "detected-objects",
              paint: {
                "fill-color": "#ff0000",
                "fill-opacity": 0.3,
              },
            });
          }

          if (!map.getLayer("detected-objects-outline")) {
            map.addLayer({
              id: "detected-objects-outline",
              type: "line",
              source: "detected-objects",
              paint: {
                "line-color": "#ff0000",
                "line-width": 2,
              },
            });
          }

          // Now update the source with our data
          map.getSource("detected-objects").setData(output);
        }
      }
    } else {
      console.error("Map not fully loaded when trying to update source");
    }

    // Update loading indicator
    if (loadingElement) {
      loadingElement.innerHTML = "Oriented object detection completed";
      // Hide the indicator after 5 seconds (changed from 300000ms/5min)
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 5000);
    }
  } catch (error) {
    console.error("Error during oriented object detection:", error);

    // Update loading indicator with error
    if (loadingElement) {
      loadingElement.innerHTML = "Error during oriented object detection.";
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 5000);
    }
  } finally {
    isProcessing = false;
  }
}

async function runLandCoverClassification() {
  if (!instance_id || isProcessing) return;

  isProcessing = true;

  // Add a loading indicator
  const loadingElement =
    document.getElementById("loading-indicator") ||
    document.createElement("div");

  if (!document.getElementById("loading-indicator")) {
    loadingElement.id = "loading-indicator";
    loadingElement.style.position = "absolute";
    loadingElement.style.top = "10px";
    loadingElement.style.left = "10px";
    loadingElement.style.backgroundColor = "white";
    loadingElement.style.padding = "10px";
    loadingElement.style.borderRadius = "4px";
    loadingElement.style.zIndex = "1000";
    document.body.appendChild(loadingElement);
  }

  loadingElement.innerHTML = "Processing land cover classification...";

  try {
    const { output_geojson, binaryMasks, outputImage } = await callPipeline(
      task,
      instance_id,
      {
        polygon,
      }
    );

    console.log("Land cover classification result:", output_geojson);
    console.log("bounds:", typeof outputImage.data[0]);
    //bounds east: 114.850388 north: -3.44831 south : -3.450366 west : 114.849014
    const bbox = [
      [outputImage.bounds.west, outputImage.bounds.south],
      [outputImage.bounds.east, outputImage.bounds.north],
    ];

    let imageData;

    // Create an ImageData object from the raw image data
    if (outputImage.data) {
      const imageDataArray = Object.values(outputImage.data);
      // Add an alpha channel to the image data
      const rgbaDataArray = [];
      for (let i = 0; i < imageDataArray.length; i += 3) {
        rgbaDataArray.push(
          imageDataArray[i],
          imageDataArray[i + 1],
          imageDataArray[i + 2],
          255
        );
      }

      imageData = new ImageData(
        new Uint8ClampedArray(rgbaDataArray),
        outputImage.width,
        outputImage.height
      );
    } else {
      throw new Error("Invalid raw image data");
    }

    // Create a canvas to draw the image
    const canvas = document.createElement("canvas");
    canvas.width = outputImage.width;
    canvas.height = outputImage.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);

    // Convert the canvas to a data URL
    const dataUrl = canvas.toDataURL();

    // Add the image as a source to the map
    map.addSource("land-cover-image", {
      type: "image",
      url: dataUrl,
      coordinates: [
        [outputImage.bounds.west, outputImage.bounds.north],
        [outputImage.bounds.east, outputImage.bounds.north],
        [outputImage.bounds.east, outputImage.bounds.south],
        [outputImage.bounds.west, outputImage.bounds.south],
      ],
    });

    // Add a layer to display the image
    map.addLayer({
      id: "land-cover-image-layer",
      type: "raster",
      source: "land-cover-image",
      paint: {
        "raster-opacity": 0.7,
      },
    });

    // // Define colors for different classes
    // const colors = [
    //   "#ff0000", // red
    //   "#00ff00", // green
    //   "#0000ff", // blue
    //   "#ffff00", // yellow
    //   "#ff00ff", // magenta
    //   "#00ffff", // cyan
    //   "#800080", // purple
    //   "#ffa500", // orange
    // ];

    // // Remove any existing land cover layers
    // for (let i = 0; i < 20; i++) {
    //   const sourceId = `land-cover-source-${i}`;
    //   const fillLayerId = `land-cover-fill-${i}`;
    //   const outlineLayerId = `land-cover-outline-${i}`;

    //   if (map.getLayer(fillLayerId)) {
    //     map.removeLayer(fillLayerId);
    //   }
    //   if (map.getLayer(outlineLayerId)) {
    //     map.removeLayer(outlineLayerId);
    //   }
    //   if (map.getSource(sourceId)) {
    //     map.removeSource(sourceId);
    //   }
    // }

    // // Add each feature collection as a separate source with its own layers
    // output_geojson.forEach((featureCollection, index) => {
    //   const color = colors[index % colors.length];
    //   const sourceId = `land-cover-source-${index}`;
    //   const fillLayerId = `land-cover-fill-${index}`;
    //   const outlineLayerId = `land-cover-outline-${index}`;

    //   // Get class name from first feature if available
    //   let className = "Class " + (index + 1);
    //   if (
    //     featureCollection.features &&
    //     featureCollection.features.length > 0 &&
    //     featureCollection.features[0].properties &&
    //     featureCollection.features[0].properties.label
    //   ) {
    //     className = featureCollection.features[0].properties.label;
    //   }

    //   // Create a new source for this feature collection
    //   map.addSource(sourceId, {
    //     type: "geojson",
    //     data: featureCollection,
    //   });

    //   // Add fill layer
    //   map.addLayer({
    //     id: fillLayerId,
    //     type: "fill",
    //     source: sourceId,
    //     paint: {
    //       "fill-color": color,
    //       "fill-opacity": 0.3,
    //     },
    //   });

    //   // Add outline layer
    //   map.addLayer({
    //     id: outlineLayerId,
    //     type: "line",
    //     source: sourceId,
    //     paint: {
    //       "line-color": color,
    //       "line-width": 2,
    //     },
    //   });

    //   // Add click event for this layer
    //   map.on("click", fillLayerId, e => {
    //     if (!e.features.length) return;
    //     new maplibregl.Popup()
    //       .setLngLat(e.lngLat)
    //       .setHTML(`<strong>Class:</strong> ${className}`)
    //       .addTo(map);
    //   });

    //   // Change cursor on hover
    //   map.on("mouseenter", fillLayerId, () => {
    //     map.getCanvas().style.cursor = "pointer";
    //   });

    //   map.on("mouseleave", fillLayerId, () => {
    //     map.getCanvas().style.cursor = "";
    //   });
    // });

    // // Update loading indicator
    // if (loadingElement) {
    //   loadingElement.innerHTML = "Land cover classification completed";
    //   setTimeout(() => {
    //     loadingElement.style.display = "none";
    //   }, 5000);
    // }
  } catch (error) {
    console.error("Error during land cover classification:", error);

    // Update loading indicator with error
    if (loadingElement) {
      loadingElement.innerHTML = "Error during land cover classification.";
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 5000);
    }
  } finally {
    isProcessing = false;
  }
}

async function solarPanelDetection() {
  if (!instance_id || isProcessing) return;

  isProcessing = true;

  // Add a loading indicator for oriented object detection
  const loadingElement =
    document.getElementById("loading-indicator") ||
    document.createElement("div");

  if (!document.getElementById("loading-indicator")) {
    loadingElement.id = "loading-indicator";
    loadingElement.style.position = "absolute";
    loadingElement.style.top = "10px";
    loadingElement.style.left = "10px";
    loadingElement.style.backgroundColor = "white";
    loadingElement.style.padding = "10px";
    loadingElement.style.borderRadius = "4px";
    loadingElement.style.zIndex = "1000";
    document.body.appendChild(loadingElement);
  }

  loadingElement.innerHTML = "Processing oriented object detection...";

  try {
    const output = await callPipeline(task, instance_id, {
      polygon,
    });

    console.log("Oriented object detection result:", output);

    // Verify that output is a valid GeoJSON
    if (!output || !output.type || !output.features) {
      console.error("Invalid GeoJSON output:", output);
      throw new Error("Invalid output format");
    }

    // Ensure we have the map and source before updating
    if (map && map.loaded()) {
      // Check if source exists
      if (map.getSource("detected-objects")) {
        console.log("Updating detected-objects source with new data");
        map.getSource("detected-objects").setData(output);
      } else {
        console.error("Source 'detected-objects' not found in map");
        // Create the source if it doesn't exist (fallback)
        if (!map.getSource("detected-objects")) {
          console.log("Adding missing source 'detected-objects'");
          map.addSource("detected-objects", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          // Add layers for this source if they don't exist
          if (!map.getLayer("detected-objects-fill")) {
            map.addLayer({
              id: "detected-objects-fill",
              type: "fill",
              source: "detected-objects",
              paint: {
                "fill-color": "#ff0000",
                "fill-opacity": 0.3,
              },
            });
          }

          if (!map.getLayer("detected-objects-outline")) {
            map.addLayer({
              id: "detected-objects-outline",
              type: "line",
              source: "detected-objects",
              paint: {
                "line-color": "#ff0000",
                "line-width": 2,
              },
            });
          }

          // Now update the source with our data
          map.getSource("detected-objects").setData(output);
        }
      }
    } else {
      console.error("Map not fully loaded when trying to update source");
    }

    // Update loading indicator
    if (loadingElement) {
      loadingElement.innerHTML = "solar panel detection completed";
      // Hide the indicator after 5 seconds (changed from 300000ms/5min)
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 5000);
    }
  } catch (error) {
    console.error("Error during oriented object detection:", error);

    // Update loading indicator with error
    if (loadingElement) {
      loadingElement.innerHTML = "Error during oriented object detection.";
      setTimeout(() => {
        loadingElement.style.display = "none";
      }, 5000);
    }
  } finally {
    isProcessing = false;
  }
}
