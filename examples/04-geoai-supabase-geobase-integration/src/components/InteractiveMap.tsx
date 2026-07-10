import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MaplibreDraw from 'maplibre-gl-draw';
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
import { useGeoAI } from '../hooks/useGeoAI';
import { supabase } from '../lib/supabase';
import { attachDrawSimilarities } from '../utils/embeddingSimilarity';
import { carbon } from '../utils/carbonTheme';
import { getTaskDemoLocation, TASK_DEMO_LOCATIONS, getTaskDemoZoom, padDemoBounds } from '../utils/taskDemoLocations';
import { getProviderMaxZoom, clampTaskZoom } from '../utils/mapProviderConfig';
import { MapWorkflowPanel, getActiveWorkflowStep } from './map/MapWorkflowPanel';
import { MapDrawToolbar } from './map/MapDrawToolbar';
import {
  GEOBASE_TILE_SOURCE_ID,
  addDetectionResultsLayer,
  buildGeobaseTileUrl,
  getGeobaseProjectRef,
  DETECTION_RESULTS_LAYER_ID,
} from '../utils/geobaseTileLayer';

interface DetectionResult {
  task: string;
  detections: GeoJSON.FeatureCollection;
  geoRawImage: unknown;
  processingTime: number;
  modelLoadingTime?: number;
  embeddingSummary?: {
    numEmbeddings: number;
    patchSize?: number;
    featureDimensions?: number;
  };
}

interface InteractiveMapProps {
  provider: 'esri' | 'mapbox' | 'geobase' | 'google';
  geobaseConfig?: GeobaseConfig | null;
  isAuthenticated?: boolean;
  selectedSessionId?: string | null;
  onDetectionComplete?: (results: DetectionResult[]) => void;
  onError?: (error: string) => void;
  showDatabaseDebugger?: boolean;
  onToggleDatabaseDebugger?: (show: boolean) => void;
}

interface GeobaseConfig {
  projectRef: string;
  cogImageryUrl: string;
  apiKey: string;
}

interface DetectionTask {
  task: string;
  label: string;
  color: string;
  enabled: boolean;
  modelId?: string;
}

type EmbeddingInteractionMode = 'roi' | 'featureSelection';

const DETECTION_TASKS: DetectionTask[] = [
  { task: 'zero-shot-object-detection', label: 'Zero-shot Objects', color: TASK_DEMO_LOCATIONS['zero-shot-object-detection'].accent, enabled: false },
  { task: 'oil-storage-tank-detection', label: 'Oil Tanks', color: TASK_DEMO_LOCATIONS['oil-storage-tank-detection'].accent, enabled: false },
  { task: 'solar-panel-detection', label: 'Solar Panels', color: TASK_DEMO_LOCATIONS['solar-panel-detection'].accent, enabled: false },
  { task: 'building-detection', label: 'Buildings', color: TASK_DEMO_LOCATIONS['building-detection'].accent, enabled: false },
  { task: 'car-detection', label: 'Cars', color: TASK_DEMO_LOCATIONS['car-detection'].accent, enabled: false },
  { task: 'ship-detection', label: 'Ships', color: TASK_DEMO_LOCATIONS['ship-detection'].accent, enabled: false },
  { task: 'land-cover-classification', label: 'Land Cover', color: TASK_DEMO_LOCATIONS['land-cover-classification'].accent, enabled: false },
  {
    task: 'image-feature-extraction',
    label: 'Image Embeddings',
    color: TASK_DEMO_LOCATIONS['image-feature-extraction'].accent,
    enabled: false,
    modelId: 'geobase/dinov3-vitl16-pretrain-sat493m-ONNX',
  },
];

const getTitilerCogBaseUrl = (projectRef: string): string => {
  const envTitiler = (import.meta.env.VITE_GEOBASE_TITILER || '').trim().replace(/\/+$/, '');
  if (envTitiler) {
    return envTitiler.endsWith('/cog') ? envTitiler : `${envTitiler}/cog`;
  }

  return `https://${projectRef}.geobase.app/titiler/v1/cog`;
};

const fetchCogBounds = async (titilerUrl: string, cogUrl: string, apiKey: string): Promise<[number, number, number, number] | null> => {
  const query = `url=${encodeURIComponent(cogUrl)}${apiKey ? `&apikey=${encodeURIComponent(apiKey)}` : ''}`;

  // Preferred endpoint (works on Geobase-managed Titiler variants).
  try {
    const boundsResponse = await fetch(`${titilerUrl}/bounds?${query}`);
    if (boundsResponse.ok) {
      const boundsData = await boundsResponse.json();
      if (Array.isArray(boundsData?.bounds) && boundsData.bounds.length === 4) {
        return boundsData.bounds as [number, number, number, number];
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback endpoint (standard TiTiler route available on staging).
  const tileJsonResponse = await fetch(`${titilerUrl}/WebMercatorQuad/tilejson.json?${query}`);
  if (!tileJsonResponse.ok) {
    throw new Error(`Failed to fetch bounds: ${tileJsonResponse.statusText}`);
  }
  const tileJson = await tileJsonResponse.json();
  if (Array.isArray(tileJson?.bounds) && tileJson.bounds.length === 4) {
    return tileJson.bounds as [number, number, number, number];
  }

  return null;
};

const getGeobaseBaseUrl = (): string | null => {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (!supabaseUrl.includes('.geobase.app')) {
    return null;
  }

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
};

const getImageryBeforeLayerId = (mapInstance: maplibregl.Map): string | undefined => {
  if (mapInstance.getLayer('detection-results-layer')) {
    return 'detection-results-layer';
  }

  const styleLayers = mapInstance.getStyle().layers || [];
  const firstDrawLayer = styleLayers.find((layer) => layer.id.startsWith('gl-draw-'));
  return firstDrawLayer?.id;
};

const ensureDrawLayersOnTop = (mapInstance: maplibregl.Map): void => {
  const styleLayers = mapInstance.getStyle().layers || [];
  const drawLayerIds = styleLayers
    .map((layer) => layer.id)
    .filter((id) => id.startsWith('gl-draw-'));

  for (const layerId of drawLayerIds) {
    if (mapInstance.getLayer(layerId)) {
      mapInstance.moveLayer(layerId);
    }
  }
};

const EMBEDDING_ROI_SIZE_PX = 240;
const EMBEDDING_THRESHOLD_STORAGE_KEY = 'geoai_embeddings_similarity_threshold';
const EMBEDDING_EXPORT_LABEL_STORAGE_KEY = 'geoai_embeddings_export_label';
const EMBEDDING_ZOOM_OFFSET_STORAGE_KEY = 'geoai_embeddings_zoom_offset';

const readStoredNumber = (key: string, fallback: number): number => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readStoredString = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw;
};

const createRoiPolygonAtClick = (
  mapInstance: maplibregl.Map,
  click: maplibregl.LngLat,
  sizePx = EMBEDDING_ROI_SIZE_PX
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const centerPoint = mapInstance.project(click);
  const half = sizePx / 2;
  const nw = mapInstance.unproject([centerPoint.x - half, centerPoint.y - half]);
  const ne = mapInstance.unproject([centerPoint.x + half, centerPoint.y - half]);
  const se = mapInstance.unproject([centerPoint.x + half, centerPoint.y + half]);
  const sw = mapInstance.unproject([centerPoint.x - half, centerPoint.y + half]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [nw.lng, nw.lat],
        [ne.lng, ne.lat],
        [se.lng, se.lat],
        [sw.lng, sw.lat],
        [nw.lng, nw.lat]
      ]]
    },
    properties: {
      interaction_type: 'embedding_roi'
    }
  };
};

export function InteractiveMap({ 
  provider, 
  geobaseConfig,
  isAuthenticated = false,
  selectedSessionId = null,
  onDetectionComplete, 
  onError,
  showDatabaseDebugger,
  onToggleDatabaseDebugger
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MaplibreDraw | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<DetectionTask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use a ref to store the current selected task to avoid stale closures
  const selectedTaskRef = useRef<DetectionTask | null>(null);
  
  // Debug selectedTask state changes
  useEffect(() => {
    console.log('🔄 selectedTask state changed to:', selectedTask);
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);
  const [currentPolygon, setCurrentPolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(() => clampTaskZoom(18, getProviderMaxZoom(provider)));
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [zeroShotClassLabel, setZeroShotClassLabel] = useState('car, truck, bus');
  const [embeddingSimilarityThreshold, setEmbeddingSimilarityThreshold] = useState(() =>
    readStoredNumber(EMBEDDING_THRESHOLD_STORAGE_KEY, 0.7)
  );
  const [embeddingLayerOpacity, setEmbeddingLayerOpacity] = useState(0.55);
  const [embeddingZoomOffset, setEmbeddingZoomOffset] = useState(() =>
    readStoredNumber(EMBEDDING_ZOOM_OFFSET_STORAGE_KEY, 1.2)
  );
  const [embeddingExportLabel, setEmbeddingExportLabel] = useState(() =>
    readStoredString(EMBEDDING_EXPORT_LABEL_STORAGE_KEY, 'target')
  );
  const [embeddingInteractionMode, setEmbeddingInteractionMode] = useState<EmbeddingInteractionMode>('roi');
  const embeddingInteractionModeRef = useRef<EmbeddingInteractionMode>('roi');
  const [embeddingSelectionPolygon, setEmbeddingSelectionPolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const embeddingSelectionPolygonRef = useRef<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const embeddingRoiFeatureIdRef = useRef<string | null>(null);
  const roiUpdateDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authAccessTokenRef = useRef<string | null>(null);
  const embeddingLayerHandlersRef = useRef<
    Record<string, { move: (e: maplibregl.MapLayerMouseEvent) => void; leave: () => void }>
  >({});
  const embeddingSourceDataRef = useRef<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    embeddingInteractionModeRef.current = embeddingInteractionMode;
  }, [embeddingInteractionMode]);

  useEffect(() => {
    embeddingSelectionPolygonRef.current = embeddingSelectionPolygon;
  }, [embeddingSelectionPolygon]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EMBEDDING_THRESHOLD_STORAGE_KEY, String(embeddingSimilarityThreshold));
  }, [embeddingSimilarityThreshold]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EMBEDDING_EXPORT_LABEL_STORAGE_KEY, embeddingExportLabel);
  }, [embeddingExportLabel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EMBEDDING_ZOOM_OFFSET_STORAGE_KEY, String(embeddingZoomOffset));
  }, [embeddingZoomOffset]);

  useEffect(() => {
    return () => {
      if (roiUpdateDebounceTimerRef.current) {
        clearTimeout(roiUpdateDebounceTimerRef.current);
        roiUpdateDebounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        authAccessTokenRef.current = data.session?.access_token ?? null;
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authAccessTokenRef.current = session?.access_token ?? null;
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const transformRequest = useCallback(
    (url: string, resourceType?: maplibregl.ResourceType) => {
      if (resourceType !== 'Tile') {
        return undefined;
      }

      const geobaseBaseUrl = getGeobaseBaseUrl();
      const authToken = authAccessTokenRef.current;

      if (!geobaseBaseUrl || !authToken || !url.startsWith(geobaseBaseUrl)) {
        return undefined;
      }

      return {
        url,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };
    },
    []
  );

  const providerMaxZoom = getProviderMaxZoom(provider);

  const effectiveGeobaseConfig = useMemo(() => {
    if (!geobaseConfig) return null;
    if (!selectedTask) return geobaseConfig;

    const demo = getTaskDemoLocation(selectedTask.task);
    if (!demo?.cogImageryUrl) return geobaseConfig;

    return {
      ...geobaseConfig,
      cogImageryUrl: demo.cogImageryUrl,
    };
  }, [geobaseConfig, selectedTask]);

  const { 
    detectObjects, 
    error, 
    currentSession,
    getDetectionHistory,
    clearResults
  } = useGeoAI({
    provider,
    geobaseConfig: effectiveGeobaseConfig,
    autoSave: isAuthenticated,
    sessionName: `Interactive Detection - ${new Date().toLocaleString()}`
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create map with satellite imagery
    const mapStyle = getMapStyle(provider);
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: TASK_DEMO_LOCATIONS['solar-panel-detection'].center,
      zoom: clampTaskZoom(TASK_DEMO_LOCATIONS['solar-panel-detection'].zoom, providerMaxZoom),
      maxZoom: providerMaxZoom,
      minZoom: 1,
      transformRequest,
    });

    // Drawing (UI hidden — custom toolbar controls modes)
    const draw = new MaplibreDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false,
      },
      styles: [
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': carbon.accent,
            'fill-outline-color': carbon.accent,
            'fill-opacity': 0.12,
          },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': carbon.warm,
            'fill-outline-color': carbon.warm,
            'fill-opacity': 0.16,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': carbon.accent,
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': carbon.warm,
            'line-width': 2.5,
          },
        },
      ],
    });

    map.current.addControl(draw as unknown as maplibregl.IControl);
    drawRef.current = draw;

    // Handle polygon creation
    map.current.on('draw.create', handlePolygonCreate);
    map.current.on('draw.update', handlePolygonUpdate);
    map.current.on('draw.delete', handlePolygonDelete);
    map.current.on('click', (event) => {
      void handleEmbeddingMapClick(event);
    });

    // Add zoom level display
    map.current.on('zoom', () => {
      if (map.current) {
        setZoomLevel(Math.round(map.current.getZoom()));
      }
    });

    // Add Geobase tileserver layer for detection results if using Geobase backend
    map.current.on('load', () => {
      // Check if we're using Geobase as backend (instead of standard Supabase)
      const isUsingGeobase = checkIfUsingGeobaseBackend();
      if (isUsingGeobase) {
        addGeobaseTileLayer();
      }

      // Restore selected task view after provider/style reloads.
      const activeTask = selectedTaskRef.current;
      if (activeTask) {
        const demo = getTaskDemoLocation(activeTask.task);
        if (demo) {
          flyToTaskDemo(activeTask, false);
        }
      }
      
      // Add Geobase imagery layer if using Geobase provider
      if (provider === 'geobase' && effectiveGeobaseConfig && map.current) {
        // Style should be loaded at this point, but add a safety check
        if (map.current.isStyleLoaded()) {
          addGeobaseImageryLayer();
        } else {
          console.log('⏳ Map load event fired but style not ready, will retry...');
        }
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [provider, providerMaxZoom, transformRequest]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Check if we're using Geobase as the backend (instead of standard Supabase)
  const checkIfUsingGeobaseBackend = useCallback(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Check if the URL contains 'geobase.app' (Geobase backend)
    // vs 'supabase.co' (standard Supabase)
    const isGeobase = supabaseUrl?.includes('.geobase.app') || false;
    
    console.log('🔍 Backend check:', {
      url: supabaseUrl,
      isGeobase: isGeobase,
      backendType: isGeobase ? 'Geobase (with tileserver)' : 'Standard Supabase'
    });
    
    return isGeobase;
  }, []);

  // Add Geobase tileserver layer for detection results
  // 🚀 GEOBASE ADVANTAGE: Vector tileserver for efficient geospatial data visualization
  // This feature is exclusive to Geobase and not available in standard Supabase
  const addGeobaseTileLayer = useCallback(() => {
    if (!map.current) return;

    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const projectRef = getGeobaseProjectRef(import.meta.env.VITE_SUPABASE_URL);
    if (!apiKey || !projectRef) {
      console.warn('Missing Geobase tileserver configuration');
      return;
    }

    if (!map.current.getSource(GEOBASE_TILE_SOURCE_ID)) {
      map.current.addSource(GEOBASE_TILE_SOURCE_ID, {
        type: 'vector',
        tiles: [buildGeobaseTileUrl(projectRef, apiKey)],
      });
    }

    addDetectionResultsLayer(map.current);

    // Add hover effects
    map.current.on('mouseenter', DETECTION_RESULTS_LAYER_ID, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', DETECTION_RESULTS_LAYER_ID, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });

    // Add click handler for detection results
    map.current.on('click', DETECTION_RESULTS_LAYER_ID, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;
        
        // Create popup with detection information
        const taskType = properties?.task_type || 'Detection';
        const className = properties?.class;
        const confidence = (properties?.confidence_score * 100).toFixed(1);
        const sessionId = properties?.session_id?.slice(0, 8);
        const date = new Date(properties?.created_at).toLocaleDateString();
        
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-3" style="color: #f0f0f0;">
              <h3 class="font-semibold text-sm mb-2" style="color: #f0f0f0;">${taskType.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h3>
              ${className ? `<p class="text-xs mb-1" style="color: #a3a3a3;"><strong>Class:</strong> ${className}</p>` : ''}
              <p class="text-xs mb-1" style="color: #a3a3a3;">Confidence: ${confidence}%</p>
              <p class="text-xs mb-1" style="color: #a3a3a3;">Session: ${sessionId}...</p>
              <p class="text-xs" style="color: #a3a3a3;">Date: ${date}</p>
            </div>
          `)
          .addTo(map.current!);
      }
    });

    console.log('✅ Geobase tileserver layer added for detection results');
  }, []);

  // Refresh the Geobase tileserver layer to show new detection results
  const refreshGeobaseTileLayer = useCallback(() => {
    if (!map.current) return;

    const source = map.current.getSource(GEOBASE_TILE_SOURCE_ID) as maplibregl.VectorTileSource | undefined;
    if (!source) return;

    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const projectRef = getGeobaseProjectRef(import.meta.env.VITE_SUPABASE_URL);
    if (!apiKey || !projectRef) return;

    if (map.current.getLayer(DETECTION_RESULTS_LAYER_ID)) {
      map.current.removeLayer(DETECTION_RESULTS_LAYER_ID);
    }
    map.current.removeSource(GEOBASE_TILE_SOURCE_ID);

    map.current.addSource(GEOBASE_TILE_SOURCE_ID, {
      type: 'vector',
      tiles: [buildGeobaseTileUrl(projectRef, apiKey, Date.now())],
    });

    addDetectionResultsLayer(map.current);
    console.log('🔄 Geobase tileserver layer refreshed to show new detections');
  }, []);

  // Fetch COG bounds and zoom to them
  const zoomToCogBounds = useCallback(async (
    geobaseConfig: GeobaseConfig,
    options?: { animate?: boolean }
  ) => {
    if (!map.current) return;
    const animate = options?.animate ?? true;

    try {
      console.log('🔍 Fetching COG bounds for auto-zoom...');
      
      const titilerUrl = getTitilerCogBaseUrl(geobaseConfig.projectRef);
      const bounds = await fetchCogBounds(titilerUrl, geobaseConfig.cogImageryUrl, geobaseConfig.apiKey);
      
      if (bounds && bounds.length === 4) {
        // Create bounds object and fit map to it
        const lngLatBounds = new maplibregl.LngLatBounds(
          [bounds[0], bounds[1]], // southwest corner
          [bounds[2], bounds[3]]  // northeast corner
        );
        
        map.current.fitBounds(lngLatBounds, {
          padding: 50, // Add some padding around the bounds
          maxZoom: 18, // Don't zoom in too much
          duration: animate ? 1000 : 0
        });
        
        console.log('✅ Map zoomed to COG bounds:', bounds);
      } else {
        console.warn('⚠️ Invalid bounds data received from Titiler');
      }
    } catch (error) {
      console.error('❌ Error fetching COG bounds:', error);
      // Don't throw - this is a nice-to-have feature
    }
  }, []);

  // Add Geobase imagery layer when using Geobase provider
  const addGeobaseImageryLayer = useCallback(async (options?: { autoZoomToBounds?: boolean; animateZoom?: boolean }) => {
    if (!map.current || !effectiveGeobaseConfig) return;
    const autoZoomToBounds = options?.autoZoomToBounds ?? true;
    const animateZoom = options?.animateZoom ?? true;

    // Check if the map style is loaded before adding sources
    if (!map.current.isStyleLoaded()) {
      console.log('⏳ Map style not loaded yet, will retry in 100ms...');
      // Retry after a short delay
      setTimeout(() => {
        if (map.current && effectiveGeobaseConfig) {
          addGeobaseImageryLayer({ autoZoomToBounds, animateZoom });
        }
      }, 100);
      return;
    }

    console.log('🗺️ Adding Geobase imagery layer with config:', effectiveGeobaseConfig);

    try {
      // Add Geobase raster tiles source
      if (!map.current.getSource('geobase-imagery')) {
        // Use the titiler service with the COG imagery URL
        const titilerUrl = getTitilerCogBaseUrl(effectiveGeobaseConfig.projectRef);
        const tilesUrl = `${titilerUrl}/tiles/WebMercatorQuad/{z}/{x}/{y}?apikey=${effectiveGeobaseConfig.apiKey}&url=${encodeURIComponent(effectiveGeobaseConfig.cogImageryUrl)}`;
        
        console.log('🔗 Constructed tiles URL:', tilesUrl);
        console.log('🔗 Titiler base URL:', titilerUrl);
        console.log('🔗 COG imagery URL:', effectiveGeobaseConfig.cogImageryUrl);
        console.log('🔗 API key:', effectiveGeobaseConfig.apiKey ? 'Present' : 'Missing');
        
        // Test the titiler URL directly
        const testUrl = tilesUrl.replace('{z}', '10').replace('{x}', '500').replace('{y}', '300');
        console.log('🧪 Test tile URL (z=10, x=500, y=300):', testUrl);
        
        // Test if the URL is accessible
        fetch(testUrl)
          .then(response => {
            console.log('✅ Test tile fetch response:', response.status, response.statusText);
            if (!response.ok) {
              console.error('❌ Test tile fetch failed:', response.status, response.statusText);
            }
          })
          .catch(error => {
            console.error('❌ Test tile fetch error:', error);
          });
        
        try {
        // Determine attribution based on imagery source
        let isOinHotosmImagery = false;
        try {
          const urlObj = new URL(effectiveGeobaseConfig.cogImageryUrl);
          isOinHotosmImagery = urlObj.host === 'oin-hotosm-temp.s3.us-east-1.amazonaws.com';
        } catch (e) {
          // Invalid URL or parsing error: treat as not OpenAerialMap
          isOinHotosmImagery = false;
        }
        const attribution = isOinHotosmImagery
          ? 'Geobase Backend | © OpenAerialMap contributors'
          : 'Geobase Backend';
        
        map.current.addSource('geobase-imagery', {
          type: 'raster',
          tiles: [tilesUrl],
          tileSize: 256,
          attribution: attribution
        });
          console.log('✅ Source added successfully');

          // Keep imagery below vector detections and draw layers.
          const beforeLayerId = getImageryBeforeLayerId(map.current);
          map.current.addLayer({
            id: 'geobase-imagery-layer',
            type: 'raster',
            source: 'geobase-imagery',
            minzoom: 0,
            maxzoom: 24,
            paint: {
              'raster-opacity': 1.0
            }
          }, beforeLayerId);
          ensureDrawLayersOnTop(map.current);
          
          // Move OSM layer to be behind the Geobase imagery
          if (map.current.getLayer('osm-tiles')) {
            map.current.moveLayer('osm-tiles', 'geobase-imagery-layer');
            console.log('🔄 Moved OSM layer behind Geobase imagery');
          }
          
          // Add event listeners to debug tile loading
          map.current.on('sourcedata', (e) => {
            if (e.sourceId === 'geobase-imagery') {
              console.log('🗺️ Source data event:', e.isSourceLoaded ? 'loaded' : 'loading', e.tile);
            }
          });
          
          map.current.on('sourceload', (e) => {
            if (e.sourceId === 'geobase-imagery') {
              console.log('✅ Geobase imagery source loaded');
            }
          });
          
          map.current.on('sourcerror', (e) => {
            if (e.sourceId === 'geobase-imagery') {
              console.error('❌ Geobase imagery source error:', e.error);
            }
          });
          console.log('✅ Layer added successfully');
        } catch (sourceError) {
          console.error('❌ Error adding source or layer:', sourceError);
        }

        console.log('✅ Geobase imagery layer added successfully');
        
        // Debug: Log layer order and current zoom
        const allLayers = map.current.getStyle().layers;
        console.log('🗺️ Current layer order:', allLayers.map(layer => layer.id));
        console.log('🔍 Current zoom level:', map.current.getZoom());
        
        // Force a refresh of the imagery layer
        setTimeout(() => {
          const currentMap = map.current;
          if (currentMap?.getLayer('geobase-imagery-layer')) {
            currentMap.setPaintProperty('geobase-imagery-layer', 'raster-opacity', 1.0);
            console.log('🔄 Forced imagery layer refresh');
          }
        }, 1000);
        
        if (autoZoomToBounds) {
          // Optional: initial load can zoom to COG bounds.
          await zoomToCogBounds(effectiveGeobaseConfig, { animate: animateZoom });
        }
      }
    } catch (error) {
      console.error('❌ Error adding Geobase imagery layer:', error);
      // Retry after a longer delay if there was an error
      setTimeout(() => {
        if (map.current && effectiveGeobaseConfig) {
          addGeobaseImageryLayer({ autoZoomToBounds, animateZoom });
        }
      }, 500);
    }
  }, [effectiveGeobaseConfig, zoomToCogBounds]);

  // Remove Geobase imagery layer
  const removeGeobaseImageryLayer = useCallback(() => {
    if (!map.current) return;

    try {
      if (map.current.getLayer('geobase-imagery-layer')) {
        map.current.removeLayer('geobase-imagery-layer');
        console.log('🗑️ Removed Geobase imagery layer');
      }
      if (map.current.getSource('geobase-imagery')) {
        map.current.removeSource('geobase-imagery');
        console.log('🗑️ Removed Geobase imagery source');
      }
    } catch (error) {
      console.error('❌ Error removing Geobase imagery layer:', error);
    }
  }, []);

  // Update Geobase imagery layer (remove old, add new)
  const updateGeobaseImageryLayer = useCallback(async () => {
    if (!map.current || !effectiveGeobaseConfig) return;

    console.log('🔄 Updating Geobase imagery layer with new config:', effectiveGeobaseConfig);

    // Remove existing layer and source
    removeGeobaseImageryLayer();

    // Task selection handles map positioning; avoid competing auto-zoom here.
    await addGeobaseImageryLayer({ autoZoomToBounds: false, animateZoom: false });
  }, [effectiveGeobaseConfig, addGeobaseImageryLayer, removeGeobaseImageryLayer]);

  // Add or update Geobase imagery layer when configuration changes
  useEffect(() => {
    if (provider === 'geobase' && effectiveGeobaseConfig && map.current) {
      // If style is loaded, add/update the layer immediately
      if (map.current.isStyleLoaded()) {
        updateGeobaseImageryLayer();
      } else {
        // If style is not loaded, wait for it to load
        const handleStyleLoad = () => {
          updateGeobaseImageryLayer();
          map.current?.off('styledata', handleStyleLoad);
        };
        map.current.on('styledata', handleStyleLoad);
      }
    } else if (provider !== 'geobase' && map.current) {
      // Remove Geobase imagery layer when switching away from Geobase
      removeGeobaseImageryLayer();
    }
  }, [provider, effectiveGeobaseConfig, updateGeobaseImageryLayer, removeGeobaseImageryLayer]);

  const getMapStyle = (provider: string): string | maplibregl.StyleSpecification => {
    const BASE_MAPS = {
      dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      satellite: {
          version: 8 as const,
          sources: {
          'raster-tiles': {
              type: 'raster' as const,
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 20,
              attribution: 'ESRI World Imagery'
            }
          },
        layers: [{
          id: 'carbon-background',
          type: 'background' as const,
          paint: { 'background-color': carbon.carbon },
        }, {
          id: 'World_Street_Map',
              type: 'raster' as const,
          source: 'raster-tiles',
          minzoom: 0,
        }]
            }
        };

    switch (provider) {
      case 'esri':
        return BASE_MAPS.satellite;
      case 'mapbox':
        return `mapbox://styles/mapbox/satellite-v9`;
      case 'geobase':
        // Return a base style that will be enhanced with Geobase imagery
        return {
          version: 8 as const,
          sources: {
            'osm': {
              type: 'raster' as const,
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
          },
          layers: [{
            id: 'carbon-background',
            type: 'background' as const,
            paint: { 'background-color': carbon.carbon },
          }, {
            id: 'osm-tiles',
              type: 'raster' as const,
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }]
        };
      case 'google':
        // Would need Google Maps integration here
        return BASE_MAPS.satellite;
      default:
        return BASE_MAPS.satellite;
    }
  };

  const getEmbeddingFillColorExpression = useCallback((threshold: number) => ([
    'case',
    ['has', 'draw_similarity'],
    [
      'case',
      ['>=', ['coalesce', ['get', 'draw_similarity'], -1], threshold],
      [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'draw_similarity'], threshold],
        threshold, '#de4968',
        1.0, '#fcfdbf'
      ],
      '#4b5563'
    ],
    [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'embedding_norm'], 0],
      0, '#2c105c',
      0.5, '#8c2981',
      1.0, '#de4968',
      1.5, '#fe9f6d',
      2.0, '#fcfdbf'
    ]
  ]), []);

  const getEmbeddingFillOpacityExpression = useCallback((threshold: number, layerOpacity: number) => {
    const baseOpacity = Math.max(0.05, Math.min(1, layerOpacity));
    const selectedOpacity = Math.min(1, baseOpacity + 0.3);
    const mutedOpacity = Math.max(0.05, baseOpacity * 0.2);

    return ([
    'case',
    ['has', 'draw_similarity'],
    [
      'case',
      ['>=', ['coalesce', ['get', 'draw_similarity'], -1], threshold],
      selectedOpacity,
      mutedOpacity
    ],
    baseOpacity
  ]);
  }, []);

  const applyEmbeddingDrawSimilarity = useCallback(() => {
    if (!map.current || !embeddingSourceDataRef.current) return;

    const sourceId = 'detections-image-feature-extraction';
    const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    let nextData = embeddingSourceDataRef.current;

    const activeSelectionPolygon =
      embeddingInteractionMode === 'featureSelection'
        ? embeddingSelectionPolygon
        : null;

    if (activeSelectionPolygon) {
      nextData = attachDrawSimilarities(nextData, activeSelectionPolygon);
    } else {
      nextData = {
        ...nextData,
        features: nextData.features.map((feature) => {
          const properties = { ...(feature.properties || {}) };
          delete properties.draw_similarity;
          return { ...feature, properties };
        })
      };
    }

    embeddingSourceDataRef.current = nextData;
    source.setData(nextData);

    if (map.current.getLayer(sourceId)) {
      map.current.setPaintProperty(sourceId, 'fill-color', getEmbeddingFillColorExpression(embeddingSimilarityThreshold));
      map.current.setPaintProperty(sourceId, 'fill-opacity', getEmbeddingFillOpacityExpression(embeddingSimilarityThreshold, embeddingLayerOpacity));
    }
  }, [
    embeddingInteractionMode,
    embeddingSelectionPolygon,
    embeddingLayerOpacity,
    embeddingSimilarityThreshold,
    getEmbeddingFillColorExpression,
    getEmbeddingFillOpacityExpression
  ]);


  const runDetection = useCallback(async (polygon: GeoJSON.Feature<GeoJSON.Polygon>) => {
    if (!polygon) {
      console.log('❌ No polygon provided to runDetection');
      return;
    }
    
    const currentTask = selectedTaskRef.current;
    if (!currentTask) {
      console.log('❌ No detection task selected');
      console.log('🔍 Current selectedTask state:', selectedTask);
      console.log('🔍 Current selectedTaskRef:', selectedTaskRef.current);
      if (onError) {
        onError('Please select a detection task before drawing a polygon');
      }
      return;
    }
    
    console.log('🚀 Starting detection with task:', currentTask.task);
    const isZeroShotTask = currentTask.task === 'zero-shot-object-detection';
    const zeroShotLabel = zeroShotClassLabel.trim();
    if (isZeroShotTask && !zeroShotLabel) {
      if (onError) {
        onError('Please enter at least one class label for zero-shot detection');
      }
      return;
    }
    console.log('📋 Task configuration:', {
      task: currentTask.task,
      modelId: currentTask.modelId,
      confidence: confidenceThreshold,
      threshold: 0.5,
      topk: 100,
      classLabel: isZeroShotTask ? zeroShotLabel : undefined
    });

    if (!isAuthenticated) {
      if (onError) {
        onError('Sign in to run detections and save results to Supabase');
      }
      return;
    }

    try {
      setIsProcessing(true);

      const tasks = [{
        task: currentTask.task,
        modelId: currentTask.modelId,
        confidence: confidenceThreshold,
        threshold: 0.5,
        topk: 100,
        classLabel: isZeroShotTask ? zeroShotLabel : undefined
      }];

      const requestedZoomLevel = currentTask.task === 'image-feature-extraction'
        ? clampTaskZoom(Math.round(zoomLevel + embeddingZoomOffset), providerMaxZoom)
        : clampTaskZoom(Math.round(zoomLevel), providerMaxZoom);

      const results = await detectObjects({
        polygon,
        tasks,
        mapSourceParams: {
          zoomLevel: requestedZoomLevel
        },
        postProcessingParams: {
          confidenceThreshold
        }
      });

      console.log('📊 Detection results received:', results);
      console.log('📊 Results details:', results.map(r => ({
        task: r.task,
        featureCount: r.detections.features.length,
        processingTime: r.processingTime
      })));

      setDetectionResults(results);
      
      // Display results on map
      displayDetectionResults(results);
      
      // If using Geobase backend, refresh the tileserver layer to show new detections
      const isUsingGeobase = checkIfUsingGeobaseBackend();
      if (isUsingGeobase) {
        // Add a small delay to allow database writes to complete
        setTimeout(() => {
          refreshGeobaseTileLayer();
        }, 2000);
      }
      
      if (onDetectionComplete) {
        onDetectionComplete(results);
      }

    } catch (err) {
      console.error('Detection failed:', err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'Detection failed');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [confidenceThreshold, zoomLevel, embeddingZoomOffset, zeroShotClassLabel, isAuthenticated, detectObjects, checkIfUsingGeobaseBackend, onDetectionComplete, onError, refreshGeobaseTileLayer, providerMaxZoom]);

  const handlePolygonCreate = useCallback(async (e: { features: GeoJSON.Feature[] }) => {
    console.log('🎯 Polygon created event triggered', e);
    const polygon = e.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
    console.log('📐 Polygon geometry:', polygon.geometry);
    setCurrentPolygon(polygon);
    const isEmbeddingTask = selectedTaskRef.current?.task === 'image-feature-extraction';
    const hasEmbeddingFeatures = Boolean(embeddingSourceDataRef.current?.features?.length);
    const interactionMode = embeddingInteractionModeRef.current;
    const featureId = e.features[0]?.id;
    if (interactionMode === 'roi' && featureId) {
      embeddingRoiFeatureIdRef.current = String(featureId);
    }

    if (isEmbeddingTask && interactionMode === 'featureSelection' && hasEmbeddingFeatures) {
      setEmbeddingSelectionPolygon(polygon);
      return;
    }

    await runDetection(polygon);
  }, [runDetection]);

  const handlePolygonUpdate = useCallback(async (e: { features: GeoJSON.Feature[] }) => {
    console.log('🔄 Polygon updated event triggered', e);
    const polygon = e.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
    setCurrentPolygon(polygon);
    const isEmbeddingTask = selectedTaskRef.current?.task === 'image-feature-extraction';
    const hasEmbeddingFeatures = Boolean(embeddingSourceDataRef.current?.features?.length);
    const interactionMode = embeddingInteractionModeRef.current;
    const featureId = e.features[0]?.id;
    if (interactionMode === 'roi' && featureId) {
      embeddingRoiFeatureIdRef.current = String(featureId);
    }

    if (isEmbeddingTask && interactionMode === 'featureSelection' && hasEmbeddingFeatures) {
      setEmbeddingSelectionPolygon(polygon);
      return;
    }

    if (isEmbeddingTask && interactionMode === 'roi' && hasEmbeddingFeatures) {
      if (roiUpdateDebounceTimerRef.current) {
        clearTimeout(roiUpdateDebounceTimerRef.current);
      }
      roiUpdateDebounceTimerRef.current = setTimeout(() => {
        void runDetection(polygon);
      }, 250);
      return;
    }

    await runDetection(polygon);
  }, [runDetection]);

  useEffect(() => {
    applyEmbeddingDrawSimilarity();
  }, [applyEmbeddingDrawSimilarity]);

  const displayDetectionResults = useCallback((results: DetectionResult[]) => {
    if (!map.current) return;

    // Check if we're using Geobase backend with tileserver capabilities
    const isUsingGeobase = checkIfUsingGeobaseBackend();
    const hasEmbeddingResults = results.some(result => result.task === 'image-feature-extraction');
    
    if (isUsingGeobase && !hasEmbeddingResults) {
      // Geobase backend: Use vector tileserver for efficient rendering
      console.log('🎯 Detection results will be displayed via Geobase vector tileserver layer');
      console.log('✨ This is a Geobase-exclusive feature not available in standard Supabase!');
      return;
    }

    // Note: The code below would be used if we were using traditional Supabase
    // without Geobase's tileserver capabilities
    // Remove existing detection layers
    results.forEach(result => {
      const sourceId = `detections-${result.task}`;
      const layerId = `detections-${result.task}`;
      const strokeLayerId = `${layerId}-stroke`;
      const pointLayerId = `${layerId}-points`;
      
      if (map.current?.getLayer(pointLayerId)) {
        map.current.removeLayer(pointLayerId);
      }
      if (map.current?.getLayer(strokeLayerId)) {
        map.current.removeLayer(strokeLayerId);
      }
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Add new detection layers
    results.forEach(result => {
      const sourceId = `detections-${result.task}`;
      const layerId = `detections-${result.task}`;
      const taskConfig = DETECTION_TASKS.find(t => t.task === result.task);
      const isEmbeddingTask = result.task === 'image-feature-extraction';
      
      if (result.detections.features.length > 0) {
        const sourceData = isEmbeddingTask && embeddingInteractionModeRef.current === 'featureSelection' && embeddingSelectionPolygonRef.current
          ? attachDrawSimilarities(result.detections, embeddingSelectionPolygonRef.current)
          : result.detections;
        if (isEmbeddingTask) {
          embeddingSourceDataRef.current = sourceData;
        }

        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: sourceData
        });

        const hasPolygon = result.detections.features.some(
          (feature) => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
        );
        const hasPoint = result.detections.features.some(
          (feature) => feature.geometry?.type === 'Point'
        );

        if (hasPolygon) {
          map.current?.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': isEmbeddingTask
                ? (getEmbeddingFillColorExpression(embeddingSimilarityThreshold) as unknown as string)
                : (taskConfig?.color || '#ff0000'),
              'fill-opacity': isEmbeddingTask
                ? (getEmbeddingFillOpacityExpression(embeddingSimilarityThreshold, embeddingLayerOpacity) as unknown as number)
                : 0.3
            }
          });

          map.current?.addLayer({
            id: `${layerId}-stroke`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': isEmbeddingTask ? '#111827' : (taskConfig?.color || '#ff0000'),
              'line-width': isEmbeddingTask ? 0.4 : 2,
              'line-opacity': isEmbeddingTask ? 0.35 : 0.8
            }
          });

          if (isEmbeddingTask && map.current) {
            const prevHandlers = embeddingLayerHandlersRef.current[layerId];
            if (prevHandlers) {
              map.current.off('mousemove', layerId, prevHandlers.move);
              map.current.off('mouseleave', layerId, prevHandlers.leave);
            }

            const move = (e: maplibregl.MapLayerMouseEvent) => {
              if (!map.current) return;

              // In feature-selection mode, keep similarity styling anchored to drawn selection
              // and never switch to hover-based heatmap.
              if (embeddingInteractionModeRef.current === 'featureSelection') {
                map.current.getCanvas().style.cursor = 'crosshair';
                return;
              }

              // Keep draw-driven similarity active while a selection polygon exists.
              if (embeddingSelectionPolygonRef.current) {
                map.current.getCanvas().style.cursor = 'crosshair';
                return;
              }

              const hoveredFeature = e.features?.[0];
              const hoveredIndex = Number(hoveredFeature?.properties?.patch_index);
              if (!Number.isFinite(hoveredIndex)) return;
              const lowHoverOpacity = Math.max(0.08, embeddingLayerOpacity * 0.25);
              const midHoverOpacity = Math.max(0.45, embeddingLayerOpacity * 0.75);
              const highHoverOpacity = Math.min(1, embeddingLayerOpacity + 0.35);

              map.current.setPaintProperty(layerId, 'fill-color', [
                'interpolate',
                ['linear'],
                ['coalesce', ['at', hoveredIndex, ['get', 'similarities']], 0],
                0.0, '#081d58',
                0.5, '#253494',
                0.75, '#f03b20',
                0.9, '#fd8d3c',
                1.0, '#ffffcc'
              ]);
              map.current.setPaintProperty(layerId, 'fill-opacity', [
                'interpolate',
                ['linear'],
                ['coalesce', ['at', hoveredIndex, ['get', 'similarities']], 0],
                0.0, lowHoverOpacity,
                0.6, midHoverOpacity,
                1.0, highHoverOpacity
              ]);
              map.current.getCanvas().style.cursor = 'crosshair';
            };

            const leave = () => {
              if (!map.current) return;
              map.current.setPaintProperty(layerId, 'fill-color', getEmbeddingFillColorExpression(embeddingSimilarityThreshold));
              map.current.setPaintProperty(layerId, 'fill-opacity', getEmbeddingFillOpacityExpression(embeddingSimilarityThreshold, embeddingLayerOpacity));
              map.current.getCanvas().style.cursor = '';
            };

            map.current.on('mousemove', layerId, move);
            map.current.on('mouseleave', layerId, leave);
            embeddingLayerHandlersRef.current[layerId] = { move, leave };
          }
        }

        if (hasPoint) {
          map.current?.addLayer({
            id: `${layerId}-points`,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-color': taskConfig?.color || '#8b5cf6',
              'circle-radius': 2.5,
              'circle-opacity': 0.7
            }
          });
        }
      }
    });
  }, [
    checkIfUsingGeobaseBackend,
    currentPolygon,
    embeddingLayerOpacity,
    embeddingSimilarityThreshold,
    getEmbeddingFillColorExpression,
    getEmbeddingFillOpacityExpression
  ]);

  useEffect(() => {
    if (!selectedSessionId || !map.current) return;

    let cancelled = false;

    const loadSessionResults = async () => {
      try {
        const rows = await getDetectionHistory(selectedSessionId);
        if (cancelled) return;

        const grouped = new Map<string, GeoJSON.Feature[]>();
        for (const row of rows) {
          const features = grouped.get(row.task_type) || [];
          features.push({
            type: 'Feature',
            geometry: row.geometry as GeoJSON.Geometry,
            properties: {
              ...(row.properties as Record<string, unknown> | null),
              confidence: row.confidence_score,
              score: row.confidence_score,
            },
          });
          grouped.set(row.task_type, features);
        }

        const loadedResults: DetectionResult[] = Array.from(grouped.entries()).map(([task, features]) => ({
          task,
          detections: { type: 'FeatureCollection', features },
          geoRawImage: null,
          processingTime: 0,
        }));

        setDetectionResults(loadedResults);
        displayDetectionResults(loadedResults);

        if (checkIfUsingGeobaseBackend()) {
          refreshGeobaseTileLayer();
        }
      } catch (loadError) {
        if (!cancelled && onError) {
          onError(loadError instanceof Error ? loadError.message : 'Failed to load session results');
        }
      }
    };

    void loadSessionResults();

    return () => {
      cancelled = true;
    };
  }, [
    selectedSessionId,
    getDetectionHistory,
    displayDetectionResults,
    checkIfUsingGeobaseBackend,
    refreshGeobaseTileLayer,
    onError,
  ]);

  const clearDetectionResults = useCallback(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    // Remove all detection layers
    DETECTION_TASKS.forEach(task => {
      const sourceId = `detections-${task.task}`;
      const layerId = `detections-${task.task}`;
      const strokeLayerId = `${layerId}-stroke`;
      const pointLayerId = `${layerId}-points`;
      const handlers = embeddingLayerHandlersRef.current[layerId];
      if (handlers) {
        currentMap.off('mousemove', layerId, handlers.move);
        currentMap.off('mouseleave', layerId, handlers.leave);
        delete embeddingLayerHandlersRef.current[layerId];
      }
      
      if (currentMap.getLayer(pointLayerId)) {
        currentMap.removeLayer(pointLayerId);
      }
      if (currentMap.getLayer(strokeLayerId)) {
        currentMap.removeLayer(strokeLayerId);
      }
      if (currentMap.getLayer(layerId)) {
        currentMap.removeLayer(layerId);
      }
      if (currentMap.getSource(sourceId)) {
        currentMap.removeSource(sourceId);
      }
    });

    setDetectionResults([]);
    embeddingSourceDataRef.current = null;
    embeddingRoiFeatureIdRef.current = null;
    setEmbeddingSelectionPolygon(null);
    clearResults();
  }, [clearResults]);

  const flyToTaskDemo = useCallback((task: DetectionTask, animate = true) => {
    const demo = getTaskDemoLocation(task.task);
    if (!demo || !map.current) return;

    const targetZoom = getTaskDemoZoom(demo, provider);
    const mapInstance = map.current;

    const syncZoomFromMap = () => {
      if (mapInstance) {
        setZoomLevel(Math.round(mapInstance.getZoom()));
      }
      mapInstance.off('moveend', syncZoomFromMap);
    };
    mapInstance.on('moveend', syncZoomFromMap);

    mapInstance.fitBounds(padDemoBounds(demo.bounds), {
      padding: { top: 72, bottom: 140, left: 384, right: 32 },
      maxZoom: targetZoom,
      duration: animate ? 900 : 0,
    });
  }, [provider]);

  const handleZoomLevelChange = useCallback((value: number) => {
    const clamped = clampTaskZoom(value, providerMaxZoom);
    setZoomLevel(clamped);
    if (map.current) {
      map.current.setZoom(clamped);
    }
  }, [providerMaxZoom]);

  const selectTask = useCallback((task: DetectionTask) => {
    console.log('🎯 Task selected:', task);
    setSelectedTask(task);
    flyToTaskDemo(task);
    if (task.task === 'image-feature-extraction') {
      setEmbeddingInteractionMode('roi');
      setEmbeddingSelectionPolygon(null);
      if (drawRef.current) {
        drawRef.current.changeMode('simple_select');
      }
    }
    console.log('✅ selectedTask state updated to:', task);
  }, [flyToTaskDemo]);

  const setEmbeddingMode = useCallback((mode: EmbeddingInteractionMode) => {
    setEmbeddingInteractionMode(mode);
    if (!drawRef.current) return;

    if (mode === 'roi') {
      setEmbeddingSelectionPolygon(null);
      const roiFeatureId = embeddingRoiFeatureIdRef.current;
      if (roiFeatureId) {
        drawRef.current.changeMode('direct_select', { featureId: roiFeatureId });
      } else {
        drawRef.current.changeMode('simple_select');
      }
      return;
    }

    // Enter polygon drawing immediately for feature anchor selection.
    drawRef.current.changeMode('draw_polygon');
  }, []);

  const handlePolygonDelete = useCallback((e: { features: GeoJSON.Feature[] }) => {
    const isEmbeddingTask = selectedTaskRef.current?.task === 'image-feature-extraction';
    if (!isEmbeddingTask) {
      setCurrentPolygon(null);
      clearDetectionResults();
      return;
    }

    const deletedIds = new Set(
      (e.features || [])
        .map((feature) => feature?.id)
        .filter((id) => id !== undefined && id !== null)
        .map((id) => String(id))
    );
    const deletedRoi = embeddingRoiFeatureIdRef.current ? deletedIds.has(embeddingRoiFeatureIdRef.current) : false;

    if (deletedRoi) {
      embeddingRoiFeatureIdRef.current = null;
      setCurrentPolygon(null);
      clearDetectionResults();
      return;
    }

    setEmbeddingSelectionPolygon(null);
    setCurrentPolygon(null);
  }, [clearDetectionResults]);

  const handleEmbeddingMapClick = useCallback(async (e: maplibregl.MapMouseEvent) => {
    const isEmbeddingTask = selectedTaskRef.current?.task === 'image-feature-extraction';
    if (!isEmbeddingTask || embeddingInteractionModeRef.current !== 'roi' || !map.current || !drawRef.current) {
      return;
    }

    const draw = drawRef.current;
    const roiPolygon = createRoiPolygonAtClick(map.current, e.lngLat);
    draw.deleteAll();
    const featureIds = draw.add(roiPolygon);
    const nextId = featureIds?.[0];
    if (nextId) {
      embeddingRoiFeatureIdRef.current = String(nextId);
      draw.changeMode('direct_select', { featureId: String(nextId) });
    }

    setEmbeddingSelectionPolygon(null);
    setCurrentPolygon(roiPolygon);
    await runDetection(roiPolygon);
  }, [runDetection]);

  const isEmbeddingTaskSelected = selectedTask?.task === 'image-feature-extraction';
  const filteredEmbeddingFeatureCount = isEmbeddingTaskSelected
    ? (embeddingSourceDataRef.current?.features?.filter((feature) => {
        const similarity = Number(feature.properties?.draw_similarity);
        return Number.isFinite(similarity) && similarity >= embeddingSimilarityThreshold;
      }).length || 0)
    : 0;
  const canExportResults = isEmbeddingTaskSelected
    ? filteredEmbeddingFeatureCount > 0
    : detectionResults.length > 0;

  const activeWorkflowStep = useMemo(
    () =>
      getActiveWorkflowStep({
        selectedTask,
        isAuthenticated,
        hasPolygon: Boolean(currentPolygon),
        hasResults: detectionResults.length > 0,
        isProcessing,
      }),
    [selectedTask, isAuthenticated, currentPolygon, detectionResults.length, isProcessing]
  );

  const toolbarNextStep = useMemo(() => {
    if (activeWorkflowStep === 'draw-area') {
      if (isEmbeddingTaskSelected && embeddingInteractionMode === 'roi') return null;
      return 'draw' as const;
    }
    if (activeWorkflowStep === 'run-detection' && !isProcessing) return 'run' as const;
    return null;
  }, [activeWorkflowStep, isProcessing, isEmbeddingTaskSelected, embeddingInteractionMode]);

  const activeStepHint = useMemo(() => {
    switch (activeWorkflowStep) {
      case 'choose-task':
        return 'Select a task card below to load a demo area.';
      case 'sign-in':
        return 'Use Sign In in the header to persist detections.';
      case 'draw-area':
        if (isEmbeddingTaskSelected && embeddingInteractionMode === 'roi') {
          return 'Click the map to place a region of interest.';
        }
        return 'Use Draw area in the toolbar below the map.';
      case 'run-detection':
        return isProcessing ? 'Detection in progress…' : 'Press Run detection when your area is ready.';
      case 'review':
        return 'Export results or clear them to start over.';
      default:
        return '';
    }
  }, [
    activeWorkflowStep,
    isEmbeddingTaskSelected,
    embeddingInteractionMode,
    isProcessing,
  ]);

  const workflowStatusMessage = useMemo(() => {
    if (isProcessing) return 'Running AI detection…';
    if (!selectedTask) return 'Choose a detection task to begin.';
    if (!isAuthenticated) return 'Sign in to save results to your Geobase project.';
    if (selectedTask.task === 'image-feature-extraction') {
      return embeddingInteractionMode === 'roi'
        ? 'Click the map to place an ROI, or switch to Draw anchor in settings.'
        : 'Draw an anchor polygon on the map, then run detection.';
    }
    if (currentPolygon) return 'Area drawn — run detection when ready.';
    return 'Draw an area on the map around the features you want to detect.';
  }, [
    isProcessing,
    selectedTask,
    isAuthenticated,
    embeddingInteractionMode,
    currentPolygon,
  ]);

  const handleToolbarDrawPolygon = useCallback(() => {
    if (!drawRef.current || !selectedTask) return;

    if (
      selectedTask.task === 'image-feature-extraction' &&
      embeddingInteractionMode === 'featureSelection'
    ) {
      drawRef.current.changeMode('draw_polygon');
      return;
    }

    if (selectedTask.task !== 'image-feature-extraction') {
      drawRef.current.changeMode('draw_polygon');
    }
  }, [selectedTask, embeddingInteractionMode]);

  const handleToolbarDelete = useCallback(() => {
    if (!drawRef.current) return;
    drawRef.current.trash();
    setCurrentPolygon(null);
    clearDetectionResults();
  }, [clearDetectionResults]);

  const handleToolbarRun = useCallback(() => {
    if (currentPolygon) {
      void runDetection(currentPolygon);
    }
  }, [currentPolygon, runDetection]);

  const exportResults = useCallback(() => {
    if (isEmbeddingTaskSelected) {
      const sourceData = embeddingSourceDataRef.current;
      if (!sourceData) {
        if (onError) onError('No embedding features available to export');
        return;
      }

      const label = embeddingExportLabel.trim() || 'target';
      const filteredFeatures = sourceData.features
        .filter((feature) => {
          const similarity = Number(feature.properties?.draw_similarity);
          return Number.isFinite(similarity) && similarity >= embeddingSimilarityThreshold;
        })
        .map((feature) => {
          const properties = feature.properties || {};
          const similarity = Number(properties.draw_similarity);
          const patchIndex = properties.patch_index;
          const sanitizedProperties: Record<string, unknown> = {
            label,
          };
          if (Number.isFinite(similarity)) {
            sanitizedProperties.draw_similarity = similarity;
          }
          if (patchIndex !== undefined) {
            sanitizedProperties.patch_index = patchIndex;
          }

          return {
            ...feature,
            properties: sanitizedProperties
          } as GeoJSON.Feature;
        });

      if (filteredFeatures.length === 0) {
        if (onError) onError('No embedding features matched the current similarity threshold');
        return;
      }

      const exportGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filteredFeatures
      };
      const blob = new Blob([JSON.stringify(exportGeoJson, null, 2)], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labeled-embeddings-${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (detectionResults.length === 0) return;

    const exportData = {
      session_id: currentSession,
      timestamp: new Date().toISOString(),
      provider,
      zoom_level: zoomLevel,
      confidence_threshold: confidenceThreshold,
      results: detectionResults.map(result => ({
        task: result.task,
        detection_count: result.detections.features.length,
        processing_time_ms: result.processingTime,
        detections: result.detections
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    detectionResults,
    currentSession,
    provider,
    zoomLevel,
    confidenceThreshold,
    isEmbeddingTaskSelected,
    embeddingExportLabel,
    embeddingSimilarityThreshold,
    onError
  ]);

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: carbon.carbon }}>
      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full" style={{ backgroundColor: carbon.carbon }} />
      
      <MapWorkflowPanel
        tasks={DETECTION_TASKS}
        selectedTask={selectedTask}
        onSelectTask={(task) => selectTask(task as DetectionTask)}
        isAuthenticated={isAuthenticated}
        hasPolygon={Boolean(currentPolygon)}
        hasResults={detectionResults.length > 0}
        isProcessing={isProcessing}
        currentSession={currentSession}
        activeStepHint={activeStepHint}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((value) => !value)}
        canExportResults={canExportResults}
        onExport={exportResults}
        onClearResults={clearDetectionResults}
        statusMessage={workflowStatusMessage}
        zeroShotClassLabel={zeroShotClassLabel}
        onZeroShotClassLabelChange={setZeroShotClassLabel}
        zoomLevel={zoomLevel}
        maxZoomLevel={providerMaxZoom}
        onZoomLevelChange={handleZoomLevelChange}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={setConfidenceThreshold}
        isEmbeddingTask={isEmbeddingTaskSelected}
        embeddingInteractionMode={embeddingInteractionMode}
        onEmbeddingModeChange={setEmbeddingMode}
        embeddingSimilarityThreshold={embeddingSimilarityThreshold}
        onEmbeddingSimilarityThresholdChange={setEmbeddingSimilarityThreshold}
        embeddingLayerOpacity={embeddingLayerOpacity}
        onEmbeddingLayerOpacityChange={setEmbeddingLayerOpacity}
        embeddingZoomOffset={embeddingZoomOffset}
        onEmbeddingZoomOffsetChange={setEmbeddingZoomOffset}
        embeddingExportLabel={embeddingExportLabel}
        onEmbeddingExportLabelChange={setEmbeddingExportLabel}
        filteredEmbeddingFeatureCount={filteredEmbeddingFeatureCount}
        showDatabaseDebugger={showDatabaseDebugger}
        onToggleDatabaseDebugger={onToggleDatabaseDebugger}
      />

      <MapDrawToolbar
        canDraw={Boolean(selectedTask)}
        canDelete={Boolean(currentPolygon)}
        canRun={Boolean(currentPolygon && selectedTask && isAuthenticated)}
        isProcessing={isProcessing}
        isEmbeddingTask={isEmbeddingTaskSelected}
        embeddingMode={embeddingInteractionMode}
        statusHint={workflowStatusMessage}
        nextStepHighlight={toolbarNextStep}
        onDrawPolygon={handleToolbarDrawPolygon}
        onDelete={handleToolbarDelete}
        onRun={handleToolbarRun}
      />

      {/* Results Summary */}
      {detectionResults.length > 0 && (
        <div
          className="absolute bottom-28 right-4 z-10 max-w-sm rounded-xl border p-4 shadow-2xl"
          style={{ backgroundColor: carbon.carbon, borderColor: carbon.border, color: carbon.chalk }}
        >
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: carbon.secondary }}>
            Results
          </h4>
          <div className="space-y-2">
            {detectionResults.map((result) => {
              const taskConfig = DETECTION_TASKS.find((t) => t.task === result.task);
              return (
                <div key={result.task} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: taskConfig?.color }}
                    />
                    <span>{taskConfig?.label}</span>
                  </div>
                  <span className="font-medium" style={{ color: carbon.accent }}>
                    {result.embeddingSummary
                      ? `${result.embeddingSummary.numEmbeddings} embeddings`
                      : `${result.detections.features.length} found`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div
            className="rounded-xl border px-8 py-6 text-center shadow-2xl"
            style={{ backgroundColor: carbon.carbon, borderColor: carbon.border, color: carbon.chalk }}
          >
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: carbon.border, borderTopColor: carbon.accent }}
            />
            <p className="text-lg font-medium">Running AI detection</p>
            <p className="mt-2 text-sm" style={{ color: carbon.secondary }}>
              {selectedTask?.label || 'Processing task'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
