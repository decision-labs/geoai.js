import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { geoai } from 'geoai';
import {
  clearDetections,
  clearInferenceBounds,
  displayDetections,
  displayInferenceBounds,
  ensureDrawLayersOnTop,
  getImageryBeforeLayerId,
} from './mapDraw';
import {
  buildMapStyle,
  buildWmsConfig,
  formatTaskLabel,
  getPipelineTask,
  getPostProcessingParams,
  prepareDetectionsForDisplay,
  SUPPORTED_TASKS,
  WMS_LAYER_ID,
  WMS_PRESETS,
  WMS_SOURCE_ID,
  toProviderParams,
  type QuickstartTask,
  type WmsPresetId,
  type WmsQuickstartConfig,
} from './wmsConfig';

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

function getRawDetectionCount(result: { detections?: GeoJSON.FeatureCollection }): number {
  return result.detections?.features?.length ?? 0;
}

export default function App() {
  const initialConfig = useMemo(() => buildWmsConfig(), []);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  const pipelineRef = useRef<Awaited<ReturnType<typeof geoai.pipeline>> | null>(null);
  const inferenceZoomRef = useRef(initialConfig.inferenceZoom);
  const taskRef = useRef<QuickstartTask>(initialConfig.task);

  const [config, setConfig] = useState<WmsQuickstartConfig>(initialConfig);
  const [presetId, setPresetId] = useState<WmsPresetId>(initialConfig.presetId);
  const [baseUrlInput, setBaseUrlInput] = useState(initialConfig.providerParams.baseUrl);
  const [layersInput, setLayersInput] = useState(initialConfig.providerParams.layers);
  const [task, setTask] = useState<QuickstartTask>(initialConfig.task);
  const [status, setStatus] = useState<Status>({
    tone: 'loading',
    text: 'Loading GeoAI model…',
  });
  const [detectionCount, setDetectionCount] = useState<number | null>(null);

  useEffect(() => {
    inferenceZoomRef.current = config.inferenceZoom;
  }, [config.inferenceZoom]);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const applyTileSource = useCallback((map: maplibregl.Map, nextConfig: WmsQuickstartConfig) => {
    if (map.getLayer(WMS_LAYER_ID)) {
      map.removeLayer(WMS_LAYER_ID);
    }
    if (map.getSource(WMS_SOURCE_ID)) {
      map.removeSource(WMS_SOURCE_ID);
    }

    map.addSource(WMS_SOURCE_ID, {
      type: 'raster',
      tiles: nextConfig.mapTiles,
      tileSize: nextConfig.providerParams.tileSize ?? 256,
      attribution: nextConfig.providerParams.attribution,
    });

    map.addLayer(
      {
        id: WMS_LAYER_ID,
        type: 'raster',
        source: WMS_SOURCE_ID,
      },
      getImageryBeforeLayerId(map),
    );

    ensureDrawLayersOnTop(map);
  }, []);

  const clearDetectionLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    clearDetections(map);
    clearInferenceBounds(map);
  }, []);

  const resetDraw = useCallback(() => {
    drawRef.current?.deleteAll();
    clearDetectionLayers();
    setDetectionCount(null);
    setStatus({
      tone: 'ready',
      text: 'Model ready. Draw a polygon over the orthophoto, then release to run detection.',
    });
  }, [clearDetectionLayers]);

  const initializePipeline = useCallback(
    async (nextConfig: WmsQuickstartConfig) => {
      setStatus({ tone: 'loading', text: 'Loading GeoAI model…' });
      setDetectionCount(null);
      clearDetectionLayers();
      drawRef.current?.deleteAll();

      try {
        const pipeline = await geoai.pipeline(
          [{ task: getPipelineTask(nextConfig.task) }],
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
    [clearDetectionLayers],
  );

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: buildMapStyle(initialConfig),
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
      map.addControl(draw as unknown as maplibregl.IControl, 'top-right');
      ensureDrawLayersOnTop(map);
      void initializePipeline(initialConfig);
    });

    map.on('draw.create', async (event) => {
      const pipeline = pipelineRef.current;
      const feature = event.features[0];
      const map = mapRef.current;

      if (!pipeline || !feature || !map) {
        return;
      }

      setStatus({ tone: 'running', text: 'Running detection on WMS orthophotos…' });

      try {
        const result = await pipeline.inference({
          inputs: { polygon: feature },
          mapSourceParams: { zoomLevel: inferenceZoomRef.current },
          postProcessingParams: getPostProcessingParams(taskRef.current),
        });

        clearDetectionLayers();

        const detections = result.detections as GeoJSON.FeatureCollection;
        if (!detections) {
          throw new Error('No detections returned from pipeline');
        }

        if (result.geoRawImage) {
          displayInferenceBounds(map, result.geoRawImage.getBounds());
        }

        const prepared = prepareDetectionsForDisplay(taskRef.current, detections);
        const rawCount = getRawDetectionCount(result);
        const visibleCount = displayDetections(map, prepared);

        setDetectionCount(visibleCount);
        if (visibleCount > 0) {
          setStatus({
            tone: 'success',
            text: `Found ${visibleCount} detection${visibleCount === 1 ? '' : 's'}.`,
          });
        } else if (rawCount > 0) {
          setStatus({
            tone: 'neutral',
            text: `Model returned ${rawCount} result${rawCount === 1 ? '' : 's'} but none had drawable map geometry. Try a larger area or higher zoom.`,
          });
        } else {
          setStatus({
            tone: 'neutral',
            text: 'No detections in this area. Draw over parked cars or buildings at zoom 19+.',
          });
        }
      } catch (error) {
        console.error('Inference failed:', error);
        setStatus({
          tone: 'error',
          text: 'Detection failed. Check the WMS endpoint, zoom level, and browser console.',
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      pipelineRef.current = null;
    };
  }, [applyTileSource, clearDetectionLayers, initialConfig, initializePipeline]);

  const applyWmsSource = async (options?: {
    baseUrl?: string;
    layers?: string;
    preset?: WmsPresetId;
    mapCenter?: [number, number];
    inferenceZoom?: number;
  }) => {
    const trimmedUrl = (options?.baseUrl ?? baseUrlInput).trim();
    const trimmedLayers = (options?.layers ?? layersInput).trim();
    if (!trimmedUrl || !trimmedLayers) {
      setStatus({ tone: 'error', text: 'Enter a WMS base URL and layer name first.' });
      return;
    }

    const nextPresetId = options?.preset ?? (presetId === 'custom' ? 'custom' : presetId);
    const nextConfig = buildWmsConfig({
      baseUrl: trimmedUrl,
      layers: trimmedLayers,
      task,
      presetId: nextPresetId,
      mapCenter: options?.mapCenter ?? config.mapCenter,
      inferenceZoom: options?.inferenceZoom ?? config.inferenceZoom,
    });
    setConfig(nextConfig);
    setBaseUrlInput(trimmedUrl);
    setLayersInput(trimmedLayers);
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

  const applyPreset = async (nextPresetId: 'nrw-dop') => {
    const preset = WMS_PRESETS[nextPresetId];
    setPresetId(nextPresetId);
    setBaseUrlInput(preset.baseUrl);
    setLayersInput(preset.layers);
    await applyWmsSource({
      baseUrl: preset.baseUrl,
      layers: preset.layers,
      preset: nextPresetId,
      mapCenter: preset.mapCenter,
      inferenceZoom: preset.inferenceZoom,
    });
  };

  const changeTask = async (nextTask: QuickstartTask) => {
    setTask(nextTask);
    const nextConfig = buildWmsConfig({
      baseUrl: config.providerParams.baseUrl,
      layers: config.providerParams.layers,
      version: config.providerParams.version,
      crs: config.providerParams.crs,
      format: config.providerParams.format,
      attribution: config.providerParams.attribution,
      task: nextTask,
      inferenceZoom: undefined,
    });
    setConfig(nextConfig);
    inferenceZoomRef.current = nextConfig.inferenceZoom;

    const map = mapRef.current;
    if (map && nextConfig.inferenceZoom !== map.getZoom()) {
      map.flyTo({ zoom: nextConfig.inferenceZoom, essential: true });
    }

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
          <h1>WMS Quickstart</h1>
          <p>
            Uses the GeoAI.js <code>provider: &quot;wms&quot;</code> pipeline with{' '}
            <strong>Geobasis NRW orthophotos</strong> (public German open data, no API key).
          </p>

          <label className="field">
            <span>WMS preset</span>
            <select
              value={presetId}
              onChange={(event) => {
                const value = event.target.value as WmsPresetId;
                if (value === 'custom') {
                  setPresetId('custom');
                  return;
                }
                void applyPreset(value);
              }}
            >
              <option value="nrw-dop">{WMS_PRESETS['nrw-dop'].label}</option>
              <option value="custom">Custom WMS</option>
            </select>
          </label>

          <label className="field">
            <span>WMS base URL</span>
            <textarea
              rows={3}
              value={baseUrlInput}
              onChange={(event) => {
                setBaseUrlInput(event.target.value);
                setPresetId('custom');
              }}
              placeholder="https://www.wms.nrw.de/geobasis/wms_nw_dop"
            />
          </label>

          <label className="field">
            <span>Layers</span>
            <input
              value={layersInput}
              onChange={(event) => {
                setLayersInput(event.target.value);
                setPresetId('custom');
              }}
              placeholder="nw_dop_rgb"
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
            <button type="button" onClick={() => void applyWmsSource()}>
              Apply custom WMS source
            </button>
          </div>

          <div className="hint">
            <strong>Data source</strong>
            <ul>
              <li>
                <a href="https://open.nrw/dataset/56fb584b-10cf-4009-a405-0bef06bb3e00" target="_blank" rel="noreferrer">
                  Digitale Orthophotos NW (Open.NRW)
                </a>
              </li>
              <li>
                Capabilities:{' '}
                <code>…/wms_nw_dop?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0</code>
              </li>
            </ul>
            <p>
              <strong>Car Detection</strong> uses the object-detection model (vehicle bounding boxes).
              Draw over parked cars at zoom <strong>20+</strong>. Purple dashed outline = inference area.
            </p>
          </div>
        </aside>

        <div ref={mapContainerRef} className="map-panel" />
      </div>
    </div>
  );
}
