import { geoai } from "https://cdn.jsdelivr.net/npm/geoai@1.0.3/geoai.js";

const { Deck, TileLayer, BitmapLayer, GeoJsonLayer, ScatterplotLayer } = deck;

const INITIAL_VIEW_STATE = {
  longitude: 56.35167998561383,
  latitude: 25.204961334530914,
  zoom: 15,
  pitch: 0,
  bearing: 0,
};

const mapProviderConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};

class DeckGLDemo {
  constructor() {
    this.deck = null;
    this.pipeline = null;
    this.currentPolygon = [];
    this.detectionResults = null;
    this.isDrawing = false;
    this.satelliteLayer = null;
    this.initializeApp();
  }

  async initializeApp() {
    this.updateStatus("Initializing AI Model...", "#ffa500");

    try {
      // Create satellite layer once
      this.satelliteLayer = this.createSatelliteLayer();

      // Initialize Deck.gl
      this.deck = new Deck({
        container: "map",
        initialViewState: INITIAL_VIEW_STATE,
        controller: true,
        layers: [this.satelliteLayer],
        onClick: this.handleMapClick.bind(this),
      });

      // Initialize GeoAI pipeline
      this.pipeline = await geoai.pipeline(
        [{ task: "oil-storage-tank-detection" }],
        mapProviderConfig
      );

      this.updateStatus(
        'AI Model Ready! Click "Draw Polygon" and click on map to create polygon.',
        "#4caf50"
      );
      document.getElementById("draw-polygon").disabled = false;
      document.getElementById("clear-map").disabled = false;
    } catch (error) {
      console.error("Initialization error:", error);
      this.updateStatus("Failed to Initialize Model", "#f44336");
    }

    this.setupEventListeners();
  }

  createSatelliteLayer() {
    return new TileLayer({
      id: "arcgis-world-imagery",
      data: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      tileSize: 256,
      minZoom: 0,
      maxZoom: 19,
      loadOptions: { image: { type: "imagebitmap" } },
      onTileError: err => console.error("tile error", err),
      renderSubLayers: props => {
        const { boundingBox } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [
            boundingBox[0][0],
            boundingBox[0][1],
            boundingBox[1][0],
            boundingBox[1][1],
          ],
        });
      },
    });
  }

  setupEventListeners() {
    document.getElementById("draw-polygon").addEventListener("click", () => {
      this.toggleDrawing();
    });

    document.getElementById("clear-map").addEventListener("click", () => {
      this.clearMap();
    });
  }

  toggleDrawing() {
    this.isDrawing = !this.isDrawing;
    const button = document.getElementById("draw-polygon");

    if (this.isDrawing) {
      button.textContent = "Finish Polygon";
      button.style.background = "#ff9800";
      this.updateStatus(
        'Click on map to add points. Click "Finish Polygon" when done.',
        "#2196f3"
      );
      this.currentPolygon = [];
    } else {
      this.finishPolygon();
    }
  }

  handleMapClick(info) {
    if (!this.isDrawing) return;

    const { coordinate } = info;
    this.currentPolygon.push(coordinate);
    this.updatePolygonLayer();
  }

  resetDrawingState() {
    this.isDrawing = false;
    const button = document.getElementById("draw-polygon");
    button.textContent = "Draw Polygon";
    button.style.background = "#2196f3";
  }

  updatePolygonLayer() {
    const layers = [this.satelliteLayer];

    // Add current polygon being drawn
    if (this.currentPolygon.length > 0) {
      const polygonGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: this.currentPolygon.length > 2 ? "Polygon" : "LineString",
              coordinates:
                this.currentPolygon.length > 2
                  ? [[...this.currentPolygon, this.currentPolygon[0]]]
                  : this.currentPolygon,
            },
          },
        ],
      };

      layers.push(
        new GeoJsonLayer({
          id: "drawing-polygon",
          data: polygonGeoJson,
          getFillColor: [0, 0, 255, 100],
          getLineColor: [0, 0, 255, 255],
          getLineWidth: 2,
          filled: this.currentPolygon.length > 2,
          stroked: true,
        })
      );

      // Add point markers for each clicked node
      layers.push(
        new ScatterplotLayer({
          id: "drawing-points",
          data: this.currentPolygon,
          getPosition: d => d,
          getRadius: 8,
          getFillColor: [255, 255, 255, 255],
          getLineColor: [0, 0, 255, 255],
          getLineWidth: 2,
          stroked: true,
          filled: true,
        })
      );
    }

    // Add detection results if they exist
    if (this.detectionResults) {
      layers.push(
        new GeoJsonLayer({
          id: "detections",
          data: this.detectionResults,
          getFillColor: [255, 0, 0, 128],
          getLineColor: [255, 0, 0, 255],
          getLineWidth: 2,
          filled: true,
          stroked: true,
        })
      );
    }

    this.deck.setProps({ layers });
  }

  async finishPolygon() {
    if (this.currentPolygon.length < 3) {
      alert("Please draw at least 3 points to create a polygon");
      return;
    }

    this.resetDrawingState();

    // Create GeoJSON polygon
    const polygon = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...this.currentPolygon, this.currentPolygon[0]]],
      },
    };

    // Run detection
    this.updateStatus("Processing detection...", "#2196f3");
    this.showLoader();

    try {
      const result = await this.pipeline.inference({
        inputs: { polygon },
        mapSourceParams: { zoomLevel: 15 },
      });

      this.detectionResults = result.detections;
      this.updatePolygonLayer();

      const count = result.detections.features?.length || 0;
      this.updateStatus(
        `Found ${count} oil storage tank${count !== 1 ? "s" : ""}!`,
        "#4caf50"
      );
    } catch (error) {
      console.error("Detection error:", error);
      this.updateStatus("Error during detection", "#f44336");
    } finally {
      this.hideLoader();
    }
  }

  clearMap() {
    this.currentPolygon = [];
    this.detectionResults = null;
    this.resetDrawingState();

    this.deck.setProps({
      layers: [this.satelliteLayer],
    });

    this.updateStatus(
      'AI Model Ready! Click "Draw Polygon" and click on map to create polygon.',
      "#4caf50"
    );
  }

  updateStatus(text, color) {
    const statusEl = document.getElementById("status");
    statusEl.textContent = text;
    statusEl.style.background = color;
  }

  showLoader() {
    const loader = document.getElementById("loader");
    loader.style.display = "block";
  }

  hideLoader() {
    const loader = document.getElementById("loader");
    loader.style.display = "none";
  }
}

// Start the demo when DOM is ready
new DeckGLDemo();
