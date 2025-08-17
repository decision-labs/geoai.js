import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoai, ProviderParams } from '@geobase.js/geoai';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';

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
  const [detections, setDetections] = useState<any[]>([]);
  const [modelStatus, setModelStatus] = useState<'idle' | 'initializing' | 'pipeline-ready' | 'inferencing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pipelineRef = useRef<any>(null);

  // Initialize the pipeline on page load
  useEffect(() => {
    let isMounted = true;
    setModelStatus('initializing');
    setError(null);

    (async () => {
      try {
        const pipeline = await geoai.pipeline([{ task: "building-detection" }], config as ProviderParams);
        console.log('pipeline', pipeline);
        if (isMounted && pipeline) {
          pipelineRef.current = pipeline;
          setModelStatus('pipeline-ready');
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to initialize model');
          setModelStatus('idle');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

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

    map.current.on('draw.create', async (e) => {
      setError(null);
      setModelStatus('inferencing');
      setDetections([]);
      const polygon = e.features[0];

      try {
        // Wait for pipeline to be ready
        const pipeline = pipelineRef.current;
        if (!pipeline) {
          setError('Model not ready yet');
          setModelStatus('pipeline-ready');
          return;
        }
        const result = await pipeline.inference({
          inputs: { polygon },
          mapSourceParams: { zoomLevel: map.current?.getZoom() || 18 }
        });

        setDetections(result.detections.features || []);

        if (map.current?.getSource('detections')) {
          map.current.removeLayer('detections');
          map.current.removeSource('detections');
        }

        map.current?.addSource('detections', { type: 'geojson', data: result.detections });
        map.current?.addLayer({
          id: 'detections',
          type: 'fill',
          source: 'detections',
          paint: { 'fill-color': DETECTION_FILL_COLOR, 'fill-opacity': 0.8 }
        });
        setModelStatus('pipeline-ready');
      } catch (err) {
        setError('Error during inference');
        setModelStatus('pipeline-ready');
      }
    });

    return () => map.current?.remove();
  }, []);

  let statusMessage = '';
  if (modelStatus === 'inferencing') statusMessage = 'Detecting buildings...';
  else if (modelStatus === 'initializing') statusMessage = 'Model loading...';
  else if (modelStatus === 'pipeline-ready') statusMessage = 'Pipeline ready. Draw a polygon to detect buildings.';
  else statusMessage = '';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div ref={mapContainer} style={{ height: '70%', width: '100%' }} />
      <div style={{ padding: '20px', height: '30%', backgroundColor: '#f5f5f5' }}>
        <h2>Building Detection</h2>
        <p>
          <span
            style={{
              color:
                modelStatus === 'initializing'
                  ? '#ffb000' // orange for initializing
                  : modelStatus === 'inferencing'
                  ? '#984ea3' // purple for inferencing
                  : modelStatus === 'pipeline-ready'
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