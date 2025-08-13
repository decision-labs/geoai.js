import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { useGeoAIWorker } from './hooks/useGeoAIWorker';

// Use GeoJSON types for type safety
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// Define the expected shape of the result object for type safety
type DetectionFeature = Feature; // Use standard GeoJSON Feature type

type DetectionGeoJSON = FeatureCollection; // Use standard GeoJSON FeatureCollection type

type InferenceResult = {
  detections?: DetectionGeoJSON;
  [key: string]: any;
};

// Your config from Step 2
const config = {
  provider: "mapbox",
  apiKey: process.env.REACT_APP_MAPBOX_API_KEY,
  style: "mapbox://styles/mapbox/satellite-v9",
};

// Colorblind-friendly fill color (blue, e.g. #377eb8)
const DETECTION_FILL_COLOR = '#377eb8';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [detections, setDetections] = useState<DetectionFeature[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use the worker hook
  const {
    isReady,
    isProcessing,
    result,
    initialize,
    runInference,
  } = useGeoAIWorker();

  // Initialize the worker pipeline on mount
  useEffect(() => {
    setError(null);
    initialize([{ task: "building-detection" }], config);
    // eslint-disable-next-line
  }, []);

  // Listen for inference results
  useEffect(() => {
    // Type guard to ensure result is of type InferenceResult
    const typedResult = result as InferenceResult | null;
    if (typedResult && typedResult.detections) {
      setDetections(typedResult.detections.features || []);
      // Add detections to map
      if (map.current) {
        if (map.current.getSource('detections')) {
          map.current.removeLayer('detections');
          map.current.removeSource('detections');
        }
        // Ensure the data is a valid GeoJSON FeatureCollection
        map.current.addSource('detections', { type: 'geojson', data: typedResult.detections as FeatureCollection });
        map.current.addLayer({
          id: 'detections',
          type: 'fill',
          source: 'detections',
          paint: { 'fill-color': DETECTION_FILL_COLOR, 'fill-opacity': 0.8 }
        });
      }
    }
  }, [result]);

  // Setup map and draw controls
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${config.apiKey}`],
            tileSize: 256,
          }
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
      },
      center: [-117.59, 47.653],
      zoom: 18
    });

    const draw = new MaplibreDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true }
    });
    // @ts-ignore
    map.current.addControl(draw);

    map.current.on('draw.create', (e) => {
      setError(null);
      setDetections([]);
      const polygon = e.features[0];

      if (!isReady) {
        setError('Model not ready yet');
        return;
      }

      runInference({
        inputs: { polygon },
        mapSourceParams: { zoomLevel: map.current?.getZoom() || 18 }
      });
    });

    return () => map.current?.remove();
    // eslint-disable-next-line
  }, [isReady]);

  // Status message logic
  let statusMessage = '';
  if (isProcessing) statusMessage = 'Detecting buildings...';
  else if (!isReady) statusMessage = 'Model loading...';
  else statusMessage = 'Pipeline ready. Draw a polygon to detect buildings.';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div ref={mapContainer} style={{ height: '70%', width: '100%' }} />
      <div style={{ padding: '20px', height: '30%', backgroundColor: '#f5f5f5' }}>
        <h2>Building Detection</h2>
        <p>
          <span
            style={{
              color:
                !isReady
                  ? '#ffb000' // orange for initializing
                  : isProcessing
                  ? '#984ea3' // purple for inferencing
                  : isReady
                  ? '#228833' // green for ready
                  : '#333'
            }}
          >
            {statusMessage}
          </span>
        </p>
        {error && <p style={{ color: '#e41a1c' }}>{error}</p>}
        {detections.length > 0 && (
          <p>
            <span style={{ color: '#377eb8', fontWeight: 600 }}>
              Found {detections.length} buildings!
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;