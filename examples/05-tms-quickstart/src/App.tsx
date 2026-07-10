import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { geoai } from 'geoai';
import {
  ensureDrawLayersOnTop,
  getImageryBeforeLayerId,
} from './mapDraw';
import {
  buildTmsConfig,
  formatTaskLabel,
  SUPPORTED_TASKS,
  TILE_PRESETS,
  toProviderParams,
  type QuickstartTask,
  type TilePresetId,
  type TmsQuickstartConfig,
} from './tmsConfig';

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
  const initialConfig = useMemo(() => buildTmsConfig(), []);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  const pipelineRef = useRef<Awaited<ReturnType<typeof geoai.pipeline>> | null>(null);
  const inferenceZoomRef = useRef(initialConfig.inferenceZoom);

  const [config, setConfig] = useState<TmsQuickstartConfig>(initialConfig);
  const [presetId, setPresetId] = useState<TilePresetId>(initialConfig.presetId);
  const [baseUrlInput, setBaseUrlInput] = useState(initialConfig.providerParams.baseUrl);
  const [task, setTask] = useState<QuickstartTask>(initialConfig.task);
  const [status, setStatus] = useState<Status>({
    tone: 'loading',
    text: 'Loading GeoAI model…',
  });
  const [detectionCount, setDetectionCount] = useState<number | null>(null);

  useEffect(() => {
    inferenceZoomRef.current = config.inferenceZoom;
  }, [config.inferenceZoom]);

  const applyTileSource = useCallback((map: maplibregl.Map, nextConfig: TmsQuickstartConfig) => {
    const sourceId = 'tms-tiles';
    const layerId = 'tms-tiles-layer';

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
      text: 'Model ready. Draw a polygon over your tile imagery, then release to run detection.',
    });
  }, [clearDetections]);

  const initializePipeline = useCallback(
    async (nextConfig: TmsQuickstartConfig) => {
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

      setStatus({ tone: 'running', text: 'Running detection on TMS tiles…' });

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
          text: 'Detection failed. Check the tile URL, zoom level, and browser console.',
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

  const applyTileUrl = async (options?: {
    baseUrl?: string;
    preset?: TilePresetId;
    mapCenter?: [number, number];
    inferenceZoom?: number;
  }) => {
    const trimmedUrl = (options?.baseUrl ?? baseUrlInput).trim();
    if (!trimmedUrl) {
      setStatus({ tone: 'error', text: 'Enter a TMS tile URL template first.' });
      return;
    }

    const nextPresetId = options?.preset ?? (presetId === 'custom' ? 'custom' : presetId);
    const nextConfig = buildTmsConfig({
      baseUrl: trimmedUrl,
      task,
      presetId: nextPresetId,
      mapCenter: options?.mapCenter ?? config.mapCenter,
      inferenceZoom: options?.inferenceZoom ?? config.inferenceZoom,
    });
    setConfig(nextConfig);
    setBaseUrlInput(trimmedUrl);
    setPresetId(nextConfig.presetId);

    const map = mapRef.current;
    if (map?.isStyleLoaded()) {
      applyTileSource(map, nextConfig);
      if (options?.mapCenter) {
        map.flyTo({
          center: options.mapCenter,
          zoom: nextConfig.inferenceZoom,
          essential: true,
        });
      }
    }

    await initializePipeline(nextConfig);
  };

  const applyPreset = async (nextPresetId: 'esri-world-imagery') => {
    const preset = TILE_PRESETS[nextPresetId];
    setPresetId(nextPresetId);
    setBaseUrlInput(preset.baseUrl);
    await applyTileUrl({
      baseUrl: preset.baseUrl,
      preset: nextPresetId,
      mapCenter: preset.mapCenter,
      inferenceZoom: preset.inferenceZoom,
    });
  };

  const changeTask = async (nextTask: QuickstartTask) => {
    setTask(nextTask);
    const nextConfig = buildTmsConfig({
      baseUrl: config.providerParams.baseUrl,
      scheme: config.providerParams.scheme,
      attribution: config.providerParams.attribution,
      extension: config.providerParams.extension,
      apiKey: config.providerParams.apiKey,
      task: nextTask,
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
          <h1>TMS Quickstart</h1>
          <p>
            Uses the GeoAI.js <code>provider: &quot;tms&quot;</code> pipeline with any XYZ or TMS tile
            template. Defaults to <strong>ESRI World Imagery</strong> satellite tiles (no API key).
          </p>

          <label className="field">
            <span>Tile preset</span>
            <select
              value={presetId}
              onChange={(event) => {
                const value = event.target.value as TilePresetId;
                if (value === 'custom') {
                  setPresetId('custom');
                  return;
                }
                void applyPreset(value);
              }}
            >
              <option value="esri-world-imagery">{TILE_PRESETS['esri-world-imagery'].label}</option>
              <option value="custom">Custom URL</option>
            </select>
          </label>

          <label className="field">
            <span>Tile URL template</span>
            <textarea
              rows={4}
              value={baseUrlInput}
              onChange={(event) => {
                setBaseUrlInput(event.target.value);
                setPresetId('custom');
              }}
              placeholder="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </label>

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
            <button type="button" onClick={() => void applyTileUrl()}>
              Apply custom tile source
            </button>
          </div>

          <div className="hint">
            <strong>Try your own tiles</strong>
            <ul>
              <li>
                <strong>ESRI satellite:</strong>{' '}
                <code>…/World_Imagery/MapServer/tile/{'{z}'}/{'{y}'}/{'{x}'}</code> (note Y before X)
              </li>
              <li>
                <strong>Image / raster tile server:</strong>{' '}
                <code>…/tiles/WebMercatorQuad/{'{z}'}/{'{x}'}/{'{y}'}?url=…</code>
              </li>
              <li>
                <strong>gdal2tiles:</strong> <code>https://host/tiles/{'{z}'}/{'{x}'}/{'{y}'}.png</code>
              </li>
              <li>
                <strong>Legacy path style:</strong> set <code>baseUrl</code> to the folder and{' '}
                <code>extension: png</code> in code.
              </li>
            </ul>
            <p>
              Map center defaults to Rome (<code>12.482, 41.885</code>). Override with{' '}
              <code>VITE_MAP_CENTER</code> in <code>.env.local</code>.
            </p>
          </div>
        </aside>

        <div ref={mapContainerRef} className="map-panel" />
      </div>
    </div>
  );
}
