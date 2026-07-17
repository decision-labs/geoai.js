import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { geoai } from 'geoai';
import { ensureDrawLayersOnTop, getImageryBeforeLayerId } from './mapDraw';
import {
  buildOamConfig,
  formatTaskLabel,
  ROME_ITEM_ID,
  SUPPORTED_TASKS,
  toProviderParams,
  type OamMode,
  type OamQuickstartConfig,
  type QuickstartTask,
} from './oamConfig';

type Status = {
  tone: 'neutral' | 'loading' | 'ready' | 'running' | 'success' | 'error';
  text: string;
};

const STATUS_COLORS: Record<Status['tone'], string> = {
  neutral: '#616161',
  loading: '#ed6c02',
  ready: '#2e7d32',
  running: '#1565c0',
  success: '#2e7d32',
  error: '#c62828',
};

function getDetectionCount(result: { detections?: GeoJSON.FeatureCollection }): number {
  return result.detections?.features?.length ?? 0;
}

export default function App() {
  const initialConfig = useMemo(() => buildOamConfig(), []);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  const pipelineRef = useRef<Awaited<ReturnType<typeof geoai.pipeline>> | null>(null);
  const inferenceZoomRef = useRef(initialConfig.inferenceZoom);

  const [config, setConfig] = useState<OamQuickstartConfig>(initialConfig);
  const [mode, setMode] = useState<OamMode>(initialConfig.mode);
  const [itemIdInput, setItemIdInput] = useState(
    initialConfig.providerParams.itemId || ROME_ITEM_ID,
  );
  const [task, setTask] = useState<QuickstartTask>(initialConfig.task);
  const [status, setStatus] = useState<Status>({
    tone: 'loading',
    text: 'Loading GeoAI model…',
  });
  const [detectionCount, setDetectionCount] = useState<number | null>(null);

  useEffect(() => {
    inferenceZoomRef.current = config.inferenceZoom;
  }, [config.inferenceZoom]);

  const applyTileSource = useCallback((map: maplibregl.Map, nextConfig: OamQuickstartConfig) => {
    const sourceId = 'oam-tiles';
    const layerId = 'oam-tiles-layer';

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    map.addSource(sourceId, {
      type: 'raster',
      tiles: nextConfig.mapTiles,
      tileSize: nextConfig.providerParams.tileSize ?? 256,
      attribution: nextConfig.providerParams.attribution,
    });

    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
      },
      getImageryBeforeLayerId(map),
    );

    ensureDrawLayersOnTop(map);
  }, []);

  const clearDetections = useCallback(() => {
    const map = mapRef.current;
    if (!map?.getSource('detections')) {
      return;
    }

    map.removeLayer('detections-fill');
    map.removeLayer('detections-outline');
    map.removeSource('detections');
  }, []);

  const resetDraw = useCallback(() => {
    drawRef.current?.deleteAll();
    clearDetections();
    setDetectionCount(null);
    setStatus({
      tone: 'ready',
      text: 'Model ready. Draw a polygon over OAM imagery, then release to run detection.',
    });
  }, [clearDetections]);

  const initializePipeline = useCallback(
    async (nextConfig: OamQuickstartConfig) => {
      setStatus({ tone: 'loading', text: 'Loading GeoAI model…' });
      setDetectionCount(null);
      clearDetections();
      drawRef.current?.deleteAll();

      try {
        const pipeline = await geoai.pipeline(
          [{ task: nextConfig.task }],
          toProviderParams(nextConfig),
        );
        pipelineRef.current = pipeline;
        setStatus({
          tone: 'ready',
          text: `Model ready (${formatTaskLabel(nextConfig.task)}). Draw a polygon to run inference.`,
        });
      } catch (error) {
        console.error('Pipeline initialization failed:', error);
        pipelineRef.current = null;
        setStatus({
          tone: 'error',
          text: 'Failed to load the GeoAI model. Check the browser console.',
        });
      }
    },
    [clearDetections],
  );

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: initialConfig.mapCenter,
      zoom: initialConfig.inferenceZoom,
    });

    const draw = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });

    mapRef.current = map;
    drawRef.current = draw;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      applyTileSource(map, initialConfig);
      map.addControl(draw as unknown as maplibregl.IControl, 'top-right');
      ensureDrawLayersOnTop(map);
      void initializePipeline(initialConfig);
    });

    map.on('draw.create', async (event) => {
      const pipeline = pipelineRef.current;
      const feature = event.features[0];

      if (!pipeline || !feature) {
        return;
      }

      setStatus({ tone: 'running', text: 'Running detection on OAM imagery…' });

      try {
        const result = await pipeline.inference({
          inputs: { polygon: feature },
          mapSourceParams: { zoomLevel: inferenceZoomRef.current },
        });

        clearDetections();

        const detections = result.detections as GeoJSON.FeatureCollection;
        if (!detections) {
          throw new Error('No detections returned from pipeline');
        }
        map.addSource('detections', {
          type: 'geojson',
          data: detections,
        });
        map.addLayer(
          {
            id: 'detections-fill',
            type: 'fill',
            source: 'detections',
            paint: {
              'fill-color': '#ff5252',
              'fill-opacity': 0.35,
            },
          },
          getImageryBeforeLayerId(map),
        );
        map.addLayer(
          {
            id: 'detections-outline',
            type: 'line',
            source: 'detections',
            paint: {
              'line-color': '#d50000',
              'line-width': 2,
            },
          },
          getImageryBeforeLayerId(map),
        );

        ensureDrawLayersOnTop(map);

        const count = getDetectionCount(result);
        setDetectionCount(count);
        setStatus({
          tone: 'success',
          text: `Found ${count} detection${count === 1 ? '' : 's'}.`,
        });
      } catch (error) {
        console.error('Inference failed:', error);
        setStatus({
          tone: 'error',
          text: 'Detection failed. Check OAM coverage for this AOI and the browser console.',
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      pipelineRef.current = null;
    };
  }, [applyTileSource, clearDetections, initialConfig, initializePipeline]);

  const applyMode = async (nextMode: OamMode, nextItemId?: string) => {
    const nextConfig = buildOamConfig({
      mode: nextMode,
      itemId: nextItemId ?? itemIdInput,
      task,
      mapCenter: config.mapCenter,
      inferenceZoom: config.inferenceZoom,
    });
    setMode(nextMode);
    setConfig(nextConfig);

    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      applyTileSource(map, nextConfig);
    }

    await initializePipeline(nextConfig);
  };

  const changeTask = async (nextTask: QuickstartTask) => {
    setTask(nextTask);
    const nextConfig = buildOamConfig({
      mode,
      itemId: itemIdInput,
      task: nextTask,
      mapCenter: config.mapCenter,
      inferenceZoom: config.inferenceZoom,
    });
    setConfig(nextConfig);
    await initializePipeline(nextConfig);
  };

  return (
    <div className="app-shell">
      <header className="status-bar" style={{ backgroundColor: STATUS_COLORS[status.tone] }}>
        <span>{status.text}</span>
        {detectionCount !== null && (
          <button type="button" className="reset-button" onClick={resetDraw}>
            Reset
          </button>
        )}
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h1>OAM Quickstart</h1>
          <p>
            Uses the GeoAI.js <code>provider: &quot;oam&quot;</code> pipeline with{' '}
            <strong>OpenAerialMap / HOT Imagery</strong> (public STAC + TiTiler, no API key).
            Defaults to a Rome orthophoto with known coverage.
          </p>

          <label className="field">
            <span>OAM mode</span>
            <select
              value={mode}
              onChange={(event) => {
                void applyMode(event.target.value as OamMode);
              }}
            >
              <option value="item">Pinned STAC item</option>
              <option value="mosaic">Collection mosaic</option>
              <option value="auto">Auto (STAC search AOI)</option>
            </select>
          </label>

          {mode === 'item' && (
            <label className="field">
              <span>STAC item id</span>
              <input
                value={itemIdInput}
                onChange={(event) => setItemIdInput(event.target.value)}
                placeholder={ROME_ITEM_ID}
              />
            </label>
          )}

          <label className="field">
            <span>GeoAI task</span>
            <select value={task} onChange={(event) => void changeTask(event.target.value as QuickstartTask)}>
              {SUPPORTED_TASKS.map((supportedTask) => (
                <option key={supportedTask} value={supportedTask}>
                  {formatTaskLabel(supportedTask)}
                </option>
              ))}
            </select>
          </label>

          <div className="actions">
            <button type="button" onClick={() => void applyMode(mode, itemIdInput.trim())}>
              Apply OAM settings
            </button>
          </div>

          <div className="hint">
            <strong>Coverage note</strong>
            <p>
              OAM is sparse — only areas with contributor uploads have imagery. This demo starts in
              Rome (<code>12.49, 41.891</code>) where item <code>{ROME_ITEM_ID}</code> exists.
            </p>
            <ul>
              <li>
                <a href="https://docs.imagery.hotosm.org/" target="_blank" rel="noreferrer">
                  HOT Imagery docs
                </a>
              </li>
              <li>
                <a href="https://docs.geobase.app/geoai/map-providers/oam" target="_blank" rel="noreferrer">
                  GeoAI.js OAM provider
                </a>
              </li>
            </ul>
          </div>
        </aside>

        <div ref={mapContainerRef} className="map-panel" />
      </div>
    </div>
  );
}
