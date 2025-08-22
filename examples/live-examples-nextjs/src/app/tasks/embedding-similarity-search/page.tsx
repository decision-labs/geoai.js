"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import maplibregl, { StyleSpecification } from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useGeoAIWorker } from "../../../hooks/useGeoAIWorker";
import { ESRI_CONFIG, GEOBASE_CONFIG, MAPBOX_CONFIG } from "../../../config";
import { MapProvider } from "../../../types"
import { createBaseMapStyle } from "../../../utils/mapStyleUtils";
import { CollapsibleAttribution } from "../../../components";


GEOBASE_CONFIG.cogImagery = "https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main/mask-generation.tif"

const mapInitConfig = {
  center : [-38.511321931983844, -13.008383365638252] as [number, number],
  zoom : 19
}

// Add validation for required environment variables
if (!GEOBASE_CONFIG.projectRef || !GEOBASE_CONFIG.apikey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_GEOBASE_PROJECT_REF and/or NEXT_PUBLIC_GEOBASE_API_KEY"
  );
}


interface GridCell {
  id: string;
  bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  };
  center: [number, number];
  polygon: GeoJSON.Feature;
  embedding?: Float32Array;
}

interface SimilarityResult {
  cellId: string;
  similarity: number;
  bounds: GridCell['bounds'];
  center: [number, number];
}

export default function EmbeddingSimilaritySearch() {
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<any | null>(null);
  
  // GeoAI hook
  const {
    isInitialized,
    isProcessing,
    error,
    lastResult,
    initializeModel,
    getEmbeddings,
    clearError,
    reset: resetWorker
  } = useGeoAIWorker(); // Use mask-generation as it supports the SAM model

  const [polygon, setPolygon] = useState<GeoJSON.Feature | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(mapInitConfig.zoom);
  const [mapProvider, setMapProvider] = useState<MapProvider>("geobase");
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [imageEmbeddings, setImageEmbeddings] = useState<any>(null);
  const [geoRawImage, setGeoRawImage] = useState<any>(null);
  const [cellEmbeddings, setCellEmbeddings] = useState<Map<string, Float32Array>>(new Map());
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.5);
  const [isComputingEmbeddings, setIsComputingEmbeddings] = useState(false);
  const [gridSize, setGridSize] = useState<number>(64);
  const [drawingMode, setDrawingMode] = useState<"polygon" | "rectangle">("polygon");
  const [persistentGridCells, setPersistentGridCells] = useState<GridCell[]>([]);
  const [isComputingSimilarity, setIsComputingSimilarity] = useState(false);
  const [persistentSimilarityData, setPersistentSimilarityData] = useState<{
    results: SimilarityResult[],
    clickedPoint: [number, number],
    clickedCell?: GridCell
  } | null>(null);
  const [currentMapZoom, setCurrentMapZoom] = useState<number>(16);

  const saveGeoRawImage = (geoRawImage: any) => {
    if (!geoRawImage) return;
    
    try {
      const geoRawImageData = {
        geoRawImage: geoRawImage,
        timestamp: Date.now(),
        gridSize: gridSize
      };
      localStorage.setItem('geoai_georawimage', JSON.stringify(geoRawImageData));
    } catch (err) {
      console.warn("Failed to save geoRawImage to localStorage:", err);
    }
  };

  const loadGeoRawImage = () => {
    try {
      const savedGeoRawImage = localStorage.getItem('geoai_georawimage');
      if (savedGeoRawImage) {
        const geoRawImageData = JSON.parse(savedGeoRawImage);
        
        const oneHour = 60 * 60 * 1000;
        const isRecent = Date.now() - geoRawImageData.timestamp < oneHour;
        const isSameGridSize = geoRawImageData.gridSize === gridSize;
        
        if (isRecent && isSameGridSize) {
          return geoRawImageData.geoRawImage;
        } else {
          localStorage.removeItem('geoai_georawimage');
        }
      }
    } catch (err) {
      console.warn("Failed to load geoRawImage from localStorage:", err);
      localStorage.removeItem('geoai_georawimage');
    }
    return null;
  };

  const updateTextLayerVisibility = useCallback(() => {
    if (!map.current) return;
    
    const currentZoom = map.current.getZoom();
    setCurrentMapZoom(currentZoom);
    const textLayer = map.current.getLayer("similarity-text-layer");
    
    if (textLayer) {
      const visibility = currentZoom > 21 ? "visible" : "none";
      map.current.setLayoutProperty("similarity-text-layer", "visibility", visibility);
    }
  }, []);

  const handleReset = () => {
    if (draw.current) {
      draw.current.deleteAll();
    }

    if (map.current) {
      const layersToRemove = ["grid-layer", "similarity-results-layer", "similarity-text-layer", "selected-point-layer", "clicked-cell-layer"];
      layersToRemove.forEach(layerId => {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
      });
      
      const sourcesToRemove = ["grid", "similarity-results", "similarity-text", "selected-point", "clicked-cell"];
      sourcesToRemove.forEach(sourceId => {
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });
    }

    // Clear localStorage
    try {
      localStorage.removeItem('geoai_embeddings');
      localStorage.removeItem('geoai_georawimage');
    } catch (err) {
      console.warn("Failed to clear localStorage:", err);
    }

    // Reset states
    setPolygon(null);
    setGridCells([]);
    setPersistentGridCells([]);
    setImageEmbeddings(null);
    setGeoRawImage(null);
    setCellEmbeddings(new Map());
    setSelectedPoint(null);
    setSimilarityResults([]);
    setPersistentSimilarityData(null);
    clearError();
    resetWorker();
  };

  const generateGrid = useCallback((polygonFeature: GeoJSON.Feature): GridCell[] => {
    const coordinates = (polygonFeature.geometry as GeoJSON.Polygon).coordinates[0];
    
    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    
    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return generateGridFromBounds(minLng, maxLng, minLat, maxLat);
  }, [gridSize]);

  const generateGridFromBounds = useCallback((minLng: number, maxLng: number, minLat: number, maxLat: number): GridCell[] => {
    const lngStep = (maxLng - minLng) / gridSize;
    const latStep = (maxLat - minLat) / gridSize;
    
    const cells: GridCell[] = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const cellMinLng = minLng + (i * lngStep);
        const cellMaxLng = minLng + ((i + 1) * lngStep);
        // Flip the latitude indexing so j=0 is at the top (maxLat)
        const cellMaxLat = maxLat - (j * latStep);
        const cellMinLat = maxLat - ((j + 1) * latStep);
        
        const cellId = `cell_${i}_${j}`;
        const center: [number, number] = [
          (cellMinLng + cellMaxLng) / 2,
          (cellMinLat + cellMaxLat) / 2
        ];
        
        const cellPolygon: GeoJSON.Feature = {
          type: "Feature",
          properties: { cellId },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [cellMinLng, cellMinLat],
              [cellMaxLng, cellMinLat],
              [cellMaxLng, cellMaxLat],
              [cellMinLng, cellMaxLat],
              [cellMinLng, cellMinLat]
            ]]
          }
        };
        
        cells.push({
          id: cellId,
          bounds: {
            minLng: cellMinLng,
            maxLng: cellMaxLng,
            minLat: cellMinLat,
            maxLat: cellMaxLat
          },
          center,
          polygon: cellPolygon,
        });
      }
    }
    
    return cells;
  }, [gridSize]);

  const computeImageEmbeddings = async () => {
    if (!polygon || !isInitialized) return;

    try {
      setIsComputingEmbeddings(true);      
      await getEmbeddings({
        inputs: {
          polygon: polygon
        },
        mapSourceParams: {
          zoomLevel,
        },
      });
      
    } catch (err) {
      console.error("Error computing embeddings:", err);
    } finally {
      setIsComputingEmbeddings(false);
    }
  };

  useEffect(() => {
    if (lastResult && lastResult.image_embeddings) {
      // Clear old embeddings before setting new ones
      setImageEmbeddings(null);
      setCellEmbeddings(new Map());
      
      setImageEmbeddings(lastResult.image_embeddings);
      setGeoRawImage(lastResult.geoRawImage);
      
      saveGeoRawImage(lastResult.geoRawImage);
      
      try {
        // Remove old embeddings before storing new ones
        localStorage.removeItem('geoai_embeddings');
        
        const embeddingsData = {
          image_embeddings: lastResult.image_embeddings.image_embeddings,
          geoRawImage: lastResult.geoRawImage,
          timestamp: Date.now(),
          gridSize: gridSize
        };
        localStorage.setItem('geoai_embeddings', JSON.stringify(embeddingsData));
      } catch (err) {
        console.warn("Failed to save embeddings to localStorage:", err);
      }
      
      // Generate grid cells - prioritize geoRawImage.bounds if available
      let cells: GridCell[] = [];
      
      if (lastResult.geoRawImage && lastResult.geoRawImage.bounds) {
        // Use bounds from geoRawImage (works even after page refresh)
        const bounds = lastResult.geoRawImage.bounds;        
        // geoRawImage.bounds format may vary, handle different formats
        let minLng: number, maxLng: number, minLat: number, maxLat: number;
        
     
        if (bounds.north !== undefined && bounds.south !== undefined && bounds.east !== undefined && bounds.west !== undefined) {
          minLng = bounds.west;
          maxLng = bounds.east;
          minLat = bounds.south;
          maxLat = bounds.north;
        } else {
          console.warn("Unknown bounds format:", bounds);
          return;
        }
        
        cells = generateGridFromBounds(minLng, maxLng, minLat, maxLat);
      } else {
        console.warn("No bounds or polygon available for grid generation");
        return;
      }
      
      setGridCells(cells);
      
      // Store for persistence
      setPersistentGridCells(cells);
      
      // Add grid visualization to map
      addGridToMap(cells);
    }
  }, [lastResult, polygon, generateGrid, generateGridFromBounds, gridSize]);

  // Load embeddings from localStorage on component mount
  useEffect(() => {
    try {
      const savedEmbeddings = localStorage.getItem('geoai_embeddings');
      if (savedEmbeddings) {
        const embeddingsData = JSON.parse(savedEmbeddings);
        
        const oneHour = 60 * 60 * 1000;
        const isRecent = Date.now() - embeddingsData.timestamp < oneHour;
        const isSameGridSize = embeddingsData.gridSize === gridSize;
        
        if (isRecent && isSameGridSize) {
          setImageEmbeddings(embeddingsData.image_embeddings);
          
          let geoRawImageToUse = embeddingsData.geoRawImage;
          if (!geoRawImageToUse) {
            geoRawImageToUse = loadGeoRawImage();
          }
          
          if (geoRawImageToUse) {
            setGeoRawImage(geoRawImageToUse);
          }
          
          if (geoRawImageToUse && geoRawImageToUse.bounds) {
            const bounds = geoRawImageToUse.bounds;
            let minLng: number, maxLng: number, minLat: number, maxLat: number;
            
            if (bounds.north !== undefined && bounds.south !== undefined && bounds.east !== undefined && bounds.west !== undefined) {
              // Format: {north, south, east, west} - This is the actual format!
              minLng = bounds.west;
              maxLng = bounds.east;
              minLat = bounds.south;
              maxLat = bounds.north;
            } else {
              console.warn("Unknown bounds format in localStorage:", bounds);
              return;
            }
            
            const cells = generateGridFromBounds(minLng, maxLng, minLat, maxLat);
            setGridCells(cells);
            setPersistentGridCells(cells);
            
            // Wait for map to be ready before adding grid
            const addGridWhenReady = () => {
              if (map.current && map.current.isStyleLoaded()) {
                addGridToMap(cells);
              } else {
                setTimeout(addGridWhenReady, 500);
              }
            };
            
            // Try immediately, then with increasing delays if needed
            setTimeout(addGridWhenReady, 100);
            setTimeout(addGridWhenReady, 1000);
            setTimeout(addGridWhenReady, 2000);
          }
        } else {
          // Remove old embeddings
          localStorage.removeItem('geoai_embeddings');        }
      }
    } catch (err) {
      localStorage.removeItem('geoai_embeddings');
    }
  }, [generateGridFromBounds, gridSize]);

  // Monitor grid layer and re-add if it disappears
  useEffect(() => {
    if (!map.current || persistentGridCells.length === 0) return;

      const checkGridLayer = () => {
        if (!map.current || !map.current.isStyleLoaded()) return;
        
        const gridLayer = map.current.getLayer("grid-layer");
        const gridSource = map.current.getSource("grid");
        
        if (!gridLayer && gridSource) {
          try {
            map.current.addLayer({
              id: "grid-layer",
              type: "line",
              source: "grid",
              paint: {
                "line-color": "#00ff00",
                "line-width": 1,
                "line-opacity": 0.3
              }
            });
          } catch (err) {
            console.error("Error re-adding grid layer:", err);
          }
        } else if (!gridLayer && !gridSource) {
          addGridToMap(persistentGridCells);
        }      // Also check similarity layer if we have results
      if (persistentSimilarityData) {
        const similarityLayer = map.current.getLayer("similarity-results-layer");
        const similaritySource = map.current.getSource("similarity-results");
        const textLayer = map.current.getLayer("similarity-text-layer");
        const textSource = map.current.getSource("similarity-text");
        
        if (!similarityLayer && !similaritySource) {
          visualizeSimilarityResults(persistentSimilarityData.results, persistentSimilarityData.clickedPoint, persistentSimilarityData.clickedCell);
        } else if (!similarityLayer && similaritySource) {
          try {
            map.current.addLayer({
              id: "similarity-results-layer",
              type: "fill",
              source: "similarity-results",
              paint: {
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "similarity"],
                  0.0, "#ffff00",
                  0.1, "#ffaa00",
                  0.2, "#ff8000",
                  0.3, "#ff4000",
                  0.4, "#ff0000"
                ],
                "fill-opacity": 0.3
              }
            });
          } catch (err) {
            console.error("Error re-adding similarity layer:", err);
          }
        }

        // Check clicked cell layer
        if (persistentSimilarityData?.clickedCell) {
          const clickedCellLayer = map.current.getLayer("clicked-cell-layer");
          const clickedCellSource = map.current.getSource("clicked-cell");
          
          if (!clickedCellLayer && !clickedCellSource) {
            // Will be re-added when visualizeSimilarityResults is called above
          } else if (!clickedCellLayer && clickedCellSource) {
            try {
              map.current.addLayer({
                id: "clicked-cell-layer",
                type: "fill",
                source: "clicked-cell",
                paint: {
                  "fill-color": "transparent",
                  "fill-outline-color": "#000000",  // Black outline for selected cell
                  "fill-opacity": 0
                }
              });
            } catch (err) {
              console.error("Error re-adding clicked cell layer:", err);
            }
          }
        }

        // Check text layer separately
        if (!textLayer && !textSource) {
          // Text layer will be re-added when visualizeSimilarityResults is called above
        } else if (!textLayer && textSource) {
          try {
            map.current.addLayer({
              id: "similarity-text-layer",
              type: "symbol",
              source: "similarity-text",
              layout: {
                "text-field": ["get", "displayText"],
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-line-height": 1.2,
                "text-max-width": 10,
                "visibility": map.current.getZoom() > 21 ? "visible" : "none"
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2
              }
            });
          } catch (err) {
            console.error("Error re-adding text layer:", err);
          }
        } else if (textLayer) {
          // Update text layer visibility based on current zoom level
          updateTextLayerVisibility();
        }
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkGridLayer, 2000);
    
    // Also check when map style changes
    const handleStyleData = () => {
      setTimeout(checkGridLayer, 100);
    };
    
    map.current.on('styledata', handleStyleData);

    return () => {
      clearInterval(interval);
      if (map.current) {
        map.current.off('styledata', handleStyleData);
      }
    };
  }, [persistentGridCells, persistentSimilarityData, updateTextLayerVisibility]);

  // Add grid visualization to map
  const addGridToMap = (cells: GridCell[]) => {
    if (!map.current) {
      return;
    }

    if (!map.current.isStyleLoaded()) {
      map.current.once('styledata', () => {
        addGridToMap(cells);
      });
      return;
    }


    const gridFeatures: GeoJSON.Feature[] = cells.map(cell => cell.polygon);
    
    const gridSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: gridFeatures
    };

    try {
      // Check if source already exists
      const existingSource = map.current.getSource("grid");
      const existingLayer = map.current.getLayer("grid-layer");
      
      if (existingSource) {
        (existingSource as maplibregl.GeoJSONSource).setData(gridSource);
      } else {
        // Add source first
        map.current.addSource("grid", {
          type: "geojson",
          data: gridSource
        });

        // Add layer
        map.current.addLayer({
          id: "grid-layer",
          type: "line",
          source: "grid",
          paint: {
            "line-color": "#00ff00",
            "line-width": 0.5,
            "line-opacity": 0.7
          }
        });
      }
      
      // Delayed verification with more details
      setTimeout(() => {
        if (map.current) {
          const layer = map.current.getLayer("grid-layer");
          const source = map.current.getSource("grid");
          
          if (!layer && source) {
            try {
              map.current.addLayer({
                id: "grid-layer",
                type: "line",
                source: "grid",
                paint: {
                  "line-color": "#00ff00",
                  "line-width": 0.5,
                  "line-opacity": 0.5
                }
              });
            } catch (err) {
              console.error("Error re-adding layer:", err);
            }
          }
        }
      }, 500);
      
    } catch (error) {
      console.error("Error adding grid to map:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  };

  // Compute cosine similarity between two embeddings
  const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Debug for first few computations
    if (isNaN(similarity)) {
      console.warn("NaN similarity detected!", { 
        dotProduct, 
        normA: Math.sqrt(normA), 
        normB: Math.sqrt(normB),
        aValues: Array.from(a.slice(0, 5)).map(v => v.toFixed(4)),
        bValues: Array.from(b.slice(0, 5)).map(v => v.toFixed(4))
      });
      return 0;
    }
    
    return similarity;
  };

  // Handle map click to perform similarity search
  const handleMapClick = useCallback(async (e: maplibregl.MapMouseEvent) => {
    if (!imageEmbeddings || gridCells.length === 0) {
      return;
    }
    const clickedPoint: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setSelectedPoint(clickedPoint);
    // Find which grid cell was clicked
    const clickedCell = gridCells.find(cell => {
      return clickedPoint[0] >= cell.bounds.minLng &&
             clickedPoint[0] <= cell.bounds.maxLng &&
             clickedPoint[1] >= cell.bounds.minLat &&
             clickedPoint[1] <= cell.bounds.maxLat;
    });

    if (!clickedCell) {
      return;
    }

    try {
      setIsComputingSimilarity(true);
      // Extract the actual embedding for the clicked cell from the SAM embeddings
      // imageEmbeddings should be in format [1, 256, 64, 64]
      const clickedCellId = clickedCell.id;
      const [_, i, j] = clickedCellId.split('_').map(Number); // Extract i, j from cell_i_j
      // Get embedding for the clicked cell if not already computed
      let clickedCellEmbedding = cellEmbeddings.get(clickedCell.id);

      if (!clickedCellEmbedding) {
        // Extract real embedding from the SAM model output
        // imageEmbeddings format: [1, 256, 64, 64] - we want the embedding at position [i, j]
        if (imageEmbeddings) {
          
          // Handle the actual format we're receiving: {image_embeddings: ..., image_positional_embeddings: ...}
          if (imageEmbeddings.image_embeddings) {
            const actualEmbeddings = imageEmbeddings.image_embeddings;
          
            
            // Handle structured format: {data: Array, dims: Array, type: string}
            if (actualEmbeddings.data && actualEmbeddings.dims && Array.isArray(actualEmbeddings.dims)) {
              const data = actualEmbeddings.data;
              const dims = actualEmbeddings.dims; // Should be [1, 256, 64, 64]
              // Verify dimensions match expected [1, 256, 64, 64]
              if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
                clickedCellEmbedding = new Float32Array(256);

                // Data is flattened, so we need to calculate the correct indices
                // For dimensions [1, 256, 64, 64], the index calculation is:
                // index = batch * (256 * 64 * 64) + channel * (64 * 64) + row * 64 + col
                // Note: Grid cell_i_j maps to: i=col (x/width), j=row (y/height)
                // So for embeddings[0][c][j][i], we access at position [j, i]
                const batchSize = dims[1] * dims[2] * dims[3]; // 256 * 64 * 64
                const channelSize = dims[2] * dims[3]; // 64 * 64
                const rowSize = dims[3]; // 64

                for (let c = 0; c < 256; c++) {
                  const index = 0 * batchSize + c * channelSize + j * rowSize + i;
                  if (index < data.length) {
                    clickedCellEmbedding[c] = data[index];
                  } else {
                    clickedCellEmbedding[c] = 0; // Fallback
                  }
                }
              } else {
                console.log("[handleMapClick] Dimension mismatch for nested structured format:", dims);
              }
            }
            // Handle other formats for actualEmbeddings
            else if (actualEmbeddings.shape && Array.isArray(actualEmbeddings.shape)) {
              if (actualEmbeddings.shape.length === 4 && actualEmbeddings.shape[0] === 1 && actualEmbeddings.shape[1] === 256) {
                clickedCellEmbedding = new Float32Array(256);
                const data = actualEmbeddings.data || actualEmbeddings;
                const [batch, channels, height, width] = actualEmbeddings.shape;
                const channelSize = height * width;
                const rowSize = width;

                for (let c = 0; c < 256; c++) {
                  const index = c * channelSize + j * rowSize + i;
                  if (index < data.length) {
                    clickedCellEmbedding[c] = data[index];
                  } else {
                    clickedCellEmbedding[c] = 0;
                  }
                }
              }
            }
            // Handle direct array format for actualEmbeddings
            else if (actualEmbeddings instanceof Float32Array || actualEmbeddings instanceof Array) {
              // Assume flattened [1, 256, 64, 64] format
              if (actualEmbeddings.length === 1 * 256 * 64 * 64) {
                clickedCellEmbedding = new Float32Array(256);
                const channelSize = 64 * 64;
                const rowSize = 64;

                for (let c = 0; c < 256; c++) {
                  const index = c * channelSize + j * rowSize + i;
                  if (index < actualEmbeddings.length) {
                    clickedCellEmbedding[c] = actualEmbeddings[index];
                  } else {
                    clickedCellEmbedding[c] = 0;
                  }
                }
              }
            }
            // Handle nested array format for actualEmbeddings
            else if (Array.isArray(actualEmbeddings) && actualEmbeddings.length > 0) {
              const embeddingData = actualEmbeddings[0]; // Get first batch
              if (embeddingData && embeddingData.length === 256) {
                clickedCellEmbedding = new Float32Array(256);
                // For legacy nested array format: embeddingData[c][i][j]
                // where i,j correspond to the grid cell indices
                for (let c = 0; c < 256; c++) {
                  const channelData = embeddingData[c];
                  if (channelData && channelData[j] && channelData[j][i] !== undefined) {
                    clickedCellEmbedding[c] = channelData[j][i];
                  } else {
                    clickedCellEmbedding[c] = 0; // Fallback
                  }
                }
              }
            }
          }
          // Try additional common formats
          // Handle new structured format: {data: Array, dims: Array, type: string}
          else if (imageEmbeddings.data && imageEmbeddings.dims && Array.isArray(imageEmbeddings.dims)) {
            const data = imageEmbeddings.data;
            const dims = imageEmbeddings.dims; // Should be [1, 256, 64, 64]
            // Verify dimensions match expected [1, 256, 64, 64]
            if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
              clickedCellEmbedding = new Float32Array(256);

              // Data is flattened, so we need to calculate the correct indices
              // For dimensions [1, 256, 64, 64], the index calculation is:
              // index = batch * (256 * 64 * 64) + channel * (64 * 64) + row * 64 + col
              // Note: Grid cell_i_j maps to: i=row (y/height), j=col (x/width)
              // So for embeddings[0][c][i][j], we access at position [i, j]
              const batchSize = dims[1] * dims[2] * dims[3]; // 256 * 64 * 64
              const channelSize = dims[2] * dims[3]; // 64 * 64
              const rowSize = dims[3]; // 64

              for (let c = 0; c < 256; c++) {
                const index = 0 * batchSize + c * channelSize + i * rowSize + j;
                if (index < data.length) {
                  clickedCellEmbedding[c] = data[index];
                } else {
                  clickedCellEmbedding[c] = 0; // Fallback
                }
              }
            } else {
              // Fallback to simulated embedding
              clickedCellEmbedding = new Float32Array(256);
              for (let c = 0; c < 256; c++) {
                clickedCellEmbedding[c] = Math.random() * 2 - 1;
              }
            }
          }
          
          // Try additional common formats
          // Format 1: Direct tensor-like object with shape property
          else if (imageEmbeddings.shape && Array.isArray(imageEmbeddings.shape)) {
            if (imageEmbeddings.shape.length === 4 && imageEmbeddings.shape[0] === 1 && imageEmbeddings.shape[1] === 256) {
              clickedCellEmbedding = new Float32Array(256);
              const data = imageEmbeddings.data || imageEmbeddings;
              const [batch, channels, height, width] = imageEmbeddings.shape;
              const channelSize = height * width;
              const rowSize = width;

              for (let c = 0; c < 256; c++) {
                const index = c * channelSize + i * rowSize + j;
                if (index < data.length) {
                  clickedCellEmbedding[c] = data[index];
                } else {
                  clickedCellEmbedding[c] = 0;
                }
              }
            }
          }
          // Format 2: Direct Float32Array or similar
          else if (imageEmbeddings instanceof Float32Array || imageEmbeddings instanceof Array) {
            // Assume flattened [1, 256, 64, 64] format
            if (imageEmbeddings.length === 1 * 256 * 64 * 64) {
              clickedCellEmbedding = new Float32Array(256);
              const channelSize = 64 * 64;
              const rowSize = 64;

              for (let c = 0; c < 256; c++) {
                const index = c * channelSize + i * rowSize + j;
                if (index < imageEmbeddings.length) {
                  clickedCellEmbedding[c] = imageEmbeddings[index];
                } else {
                  clickedCellEmbedding[c] = 0;
                }
              }
            }
          }
          // Handle legacy nested array format
          else if (Array.isArray(imageEmbeddings) && imageEmbeddings.length > 0) {
            const embeddingData = imageEmbeddings[0]; // Get first batch

            if (embeddingData && embeddingData.length === 256) {
              clickedCellEmbedding = new Float32Array(256);
              // For legacy nested array format: embeddingData[c][i][j]
              // where i,j correspond to the grid cell indices
              for (let c = 0; c < 256; c++) {
                const channelData = embeddingData[c];
                if (channelData && channelData[i] && channelData[i][j] !== undefined) {
                  clickedCellEmbedding[c] = channelData[i][j];
                } else {
                  clickedCellEmbedding[c] = 0; // Fallback
                }
              }
            } else {
              clickedCellEmbedding = new Float32Array(256);
              for (let c = 0; c < 256; c++) {
                clickedCellEmbedding[c] = Math.random() * 2 - 1;
              }
            }
          } else {
            clickedCellEmbedding = new Float32Array(256);
            for (let c = 0; c < 256; c++) {
              clickedCellEmbedding[c] = Math.random() * 2 - 1;
            }
          }
        } else {
          // Use simulated but consistent embeddings based on cell position
          clickedCellEmbedding = new Float32Array(256);
          const seed = i * 1000 + j;
          let rng = seed;
          for (let c = 0; c < 256; c++) {
            rng = (rng * 9301 + 49297) % 233280;
            clickedCellEmbedding[c] = (rng / 233280.0) * 2 - 1;
          }
        }

        // Ensure clickedCellEmbedding is always defined
        if (!clickedCellEmbedding) {
          clickedCellEmbedding = new Float32Array(256);
          for (let c = 0; c < 256; c++) {
            clickedCellEmbedding[c] = Math.random() * 2 - 1;
          }
        }

        cellEmbeddings.set(clickedCell.id, clickedCellEmbedding);
        setCellEmbeddings(new Map(cellEmbeddings));
      } else {
        console.log("[handleMapClick] Used cached embedding for clicked cell.");
      }

      // Compute similarities with other cells
      const similarities: SimilarityResult[] = [];

      for (const cell of gridCells) {
        if (cell.id === clickedCell.id) continue;

        // Get or compute embedding for this cell
        let cellEmbedding = cellEmbeddings.get(cell.id);
        if (!cellEmbedding) {
          const [_, cellI, cellJ] = cell.id.split('_').map(Number);
          cellEmbedding = new Float32Array(256);

          if (imageEmbeddings) {
            // Handle the actual format we're receiving: {image_embeddings: ..., image_positional_embeddings: ...}
            if (imageEmbeddings.image_embeddings) {
              const actualEmbeddings = imageEmbeddings.image_embeddings;
              
              // Handle structured format: {data: Array, dims: Array, type: string}
              if (actualEmbeddings.data && actualEmbeddings.dims && Array.isArray(actualEmbeddings.dims)) {
                const data = actualEmbeddings.data;
                const dims = actualEmbeddings.dims;
                if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
                  const batchSize = dims[1] * dims[2] * dims[3];
                  const channelSize = dims[2] * dims[3];
                  const rowSize = dims[3];
                  for (let c = 0; c < 256; c++) {
                    const index = 0 * batchSize + c * channelSize + cellJ * rowSize + cellI;
                    if (index < data.length) {
                      cellEmbedding[c] = data[index];
                    } else {
                      cellEmbedding[c] = 0;
                    }
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(nested structured).");
                  }
                } else {
                  const seed = cellI * 1000 + cellJ;
                  let rng = seed;
                  for (let c = 0; c < 256; c++) {
                    rng = (rng * 9301 + 49297) % 233280;
                    cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(nested dims mismatch).");
                  }
                }
              }
              // Handle other formats for actualEmbeddings
              else if (actualEmbeddings.shape && Array.isArray(actualEmbeddings.shape)) {
                if (actualEmbeddings.shape.length === 4 && actualEmbeddings.shape[0] === 1 && actualEmbeddings.shape[1] === 256) {
                  const data = actualEmbeddings.data || actualEmbeddings;
                  const [batch, channels, height, width] = actualEmbeddings.shape;
                  const channelSize = height * width;
                  const rowSize = width;
                  for (let c = 0; c < 256; c++) {
                    const index = c * channelSize + cellJ * rowSize + cellI;
                    if (index < data.length) {
                      cellEmbedding[c] = data[index];
                    } else {
                      cellEmbedding[c] = 0;
                    }
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(nested tensor format).");
                  }
                }
              }
              // Handle direct array format for actualEmbeddings
              else if (actualEmbeddings instanceof Float32Array || actualEmbeddings instanceof Array) {
                if (actualEmbeddings.length === 1 * 256 * 64 * 64) {
                  const channelSize = 64 * 64;
                  const rowSize = 64;
                  for (let c = 0; c < 256; c++) {
                    const index = c * channelSize + cellJ * rowSize + cellI;
                    if (index < actualEmbeddings.length) {
                      cellEmbedding[c] = actualEmbeddings[index];
                    } else {
                      cellEmbedding[c] = 0;
                    }
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(nested direct array).");
                  }
                }
              }
              // Handle nested array format for actualEmbeddings
              else if (Array.isArray(actualEmbeddings) && actualEmbeddings.length > 0) {
                const embeddingData = actualEmbeddings[0];
                if (embeddingData && embeddingData.length === 256) {
                  for (let c = 0; c < 256; c++) {
                    const channelData = embeddingData[c];
                    if (channelData && channelData[cellJ] && channelData[cellJ][cellI] !== undefined) {
                      cellEmbedding[c] = channelData[cellJ][cellI];
                    } else {
                      cellEmbedding[c] = 0;
                    }
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(nested legacy array).");
                  }
                } else {
                  const seed = cellI * 1000 + cellJ;
                  let rng = seed;
                  for (let c = 0; c < 256; c++) {
                    rng = (rng * 9301 + 49297) % 233280;
                    cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                  }
                  if (cell.id.endsWith("_0_0")) {
                    console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(nested legacy array mismatch).");
                  }
                }
              }
            }
            // Fallback to original format handling
            else if (imageEmbeddings.data && imageEmbeddings.dims && Array.isArray(imageEmbeddings.dims)) {
              const data = imageEmbeddings.data;
              const dims = imageEmbeddings.dims;
              if (dims.length === 4 && dims[0] === 1 && dims[1] === 256 && dims[2] === 64 && dims[3] === 64) {
                const batchSize = dims[1] * dims[2] * dims[3];
                const channelSize = dims[2] * dims[3];
                const rowSize = dims[3];
                for (let c = 0; c < 256; c++) {
                  const index = 0 * batchSize + c * channelSize + cellJ * rowSize + cellI;
                  if (index < data.length) {
                    cellEmbedding[c] = data[index];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
                // Debug log for each cell embedding extraction
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(structured).");
                }
              } else {
                const seed = cellI * 1000 + cellJ;
                let rng = seed;
                for (let c = 0; c < 256; c++) {
                  rng = (rng * 9301 + 49297) % 233280;
                  cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                }
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(dims mismatch).");
                }
              }
            }
            // Try additional common formats
            // Format 1: Direct tensor-like object with shape property
            else if (imageEmbeddings.shape && Array.isArray(imageEmbeddings.shape)) {
              if (imageEmbeddings.shape.length === 4 && imageEmbeddings.shape[0] === 1 && imageEmbeddings.shape[1] === 256) {
                const data = imageEmbeddings.data || imageEmbeddings;
                const [batch, channels, height, width] = imageEmbeddings.shape;
                const channelSize = height * width;
                const rowSize = width;

                for (let c = 0; c < 256; c++) {
                  const index = c * channelSize + cellJ * rowSize + cellI;
                  if (index < data.length) {
                    cellEmbedding[c] = data[index];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(tensor format).");
                }
              }
            }
            // Format 2: Direct Float32Array or similar
            else if (imageEmbeddings instanceof Float32Array || imageEmbeddings instanceof Array) {
              // Assume flattened [1, 256, 64, 64] format
              if (imageEmbeddings.length === 1 * 256 * 64 * 64) {
                const channelSize = 64 * 64;
                const rowSize = 64;

                for (let c = 0; c < 256; c++) {
                  const index = c * channelSize + cellJ * rowSize + cellI;
                  if (index < imageEmbeddings.length) {
                    cellEmbedding[c] = imageEmbeddings[index];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(direct array).");
                }
              }
            }
            else if (Array.isArray(imageEmbeddings) && imageEmbeddings.length > 0) {
              const embeddingData = imageEmbeddings[0];
              if (embeddingData && embeddingData.length === 256) {
                for (let c = 0; c < 256; c++) {
                  const channelData = embeddingData[c];
                  if (channelData && channelData[cellJ] && channelData[cellJ][cellI] !== undefined) {
                    cellEmbedding[c] = channelData[cellJ][cellI];
                  } else {
                    cellEmbedding[c] = 0;
                  }
                }
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Extracted embedding for cell", cell.id, "(legacy array).");
                }
              } else {
                const seed = cellI * 1000 + cellJ;
                let rng = seed;
                for (let c = 0; c < 256; c++) {
                  rng = (rng * 9301 + 49297) % 233280;
                  cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
                }
                if (cell.id.endsWith("_0_0")) {
                  console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(legacy array mismatch).");
                }
              }
            } else {
              const seed = cellI * 1000 + cellJ;
              let rng = seed;
              for (let c = 0; c < 256; c++) {
                rng = (rng * 9301 + 49297) % 233280;
                cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
              }
              if (cell.id.endsWith("_0_0")) {
                console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(unknown format).");
              }
            }
          } else {
            const seed = cellI * 1000 + cellJ;
            let rng = seed;
            for (let c = 0; c < 256; c++) {
              rng = (rng * 9301 + 49297) % 233280;
              cellEmbedding[c] = (rng / 233280.0) * 2 - 1;
            }
            if (cell.id.endsWith("_0_0")) {
              console.log("[handleMapClick] Used fallback simulated embedding for cell", cell.id, "(no imageEmbeddings).");
            }
          }

          cellEmbeddings.set(cell.id, cellEmbedding);
        }

        // Ensure both embeddings are valid before calculating similarity
        if (clickedCellEmbedding && cellEmbedding) {
          const similarity = cosineSimilarity(clickedCellEmbedding, cellEmbedding);

          // Add all similarities (we'll filter and sort later)
          similarities.push({
            cellId: cell.id,
            similarity,
            bounds: cell.bounds,
            center: cell.center
          });
        }
      }

      // Filter for cells with similarity greater than the threshold
      similarities.sort((a, b) => b.similarity - a.similarity);
      const highSimilarityCells = similarities.filter(s => s.similarity > similarityThreshold);
      setSimilarityResults(highSimilarityCells);

      // Visualize results on map
      visualizeSimilarityResults(highSimilarityCells, clickedPoint, clickedCell);

    } catch (err) {
      console.error("Error performing similarity search:", err);
    } finally {
      setIsComputingSimilarity(false);
    }
  }, [imageEmbeddings, gridCells, cellEmbeddings, similarityThreshold]);

  // Visualize similarity results on map
  const visualizeSimilarityResults = (results: SimilarityResult[], clickedPoint: [number, number], clickedCell?: GridCell) => {
    if (!map.current) return;

    // Save for persistence
    setPersistentSimilarityData({ results, clickedPoint, clickedCell });

    // Add selected point
    const selectedPointSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: clickedPoint
        }
      }]
    };

    if (map.current.getSource("selected-point")) {
      (map.current.getSource("selected-point") as maplibregl.GeoJSONSource).setData(selectedPointSource);
    } else {
      map.current.addSource("selected-point", {
        type: "geojson",
        data: selectedPointSource
      });

      map.current.addLayer({
        id: "selected-point-layer",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-color": "#ff0000",
          "circle-radius": 8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
    }

    // Add clicked cell with black outline
    if (clickedCell) {
      const clickedCellSource: GeoJSON.GeoJSON = {
        type: "FeatureCollection",
        features: [{
          ...clickedCell.polygon,
          properties: {
            ...clickedCell.polygon.properties,
            isClickedCell: true
          }
        }]
      };

      if (map.current.getSource("clicked-cell")) {
        (map.current.getSource("clicked-cell") as maplibregl.GeoJSONSource).setData(clickedCellSource);
      } else {
        map.current.addSource("clicked-cell", {
          type: "geojson",
          data: clickedCellSource
        });

        map.current.addLayer({
          id: "clicked-cell-layer",
          type: "fill",
          source: "clicked-cell",
          paint: {
            "fill-color": "transparent",
            "fill-outline-color": "#000000",  // Black outline for selected cell
            "fill-opacity": 0
          }
        });
      }
    }

    // Since results are already filtered for >90% similarity, show them all
    // But still apply the similarity threshold for additional filtering if needed
    const visualizationResults = results.filter(r => r.similarity >= similarityThreshold);
    
    // Show the high similarity results (>90%), or if threshold filters them out, show top 10 for debugging
    const finalResults = visualizationResults.length > 0 ? visualizationResults : results.slice(0, 10);

    // Add similarity results (show top results even if below threshold)
    const similarityFeatures: GeoJSON.Feature[] = finalResults.map((result, index) => {
      const cell = gridCells.find(c => c.id === result.cellId)!;
      return {
        ...cell.polygon,
        properties: {
          ...cell.polygon.properties,
          similarity: result.similarity,
          rank: index + 1,
          tileNumber: result.cellId
        }
      };
    });

    const similaritySource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: similarityFeatures
    };

    if (map.current.getSource("similarity-results")) {
      (map.current.getSource("similarity-results") as maplibregl.GeoJSONSource).setData(similaritySource);
    } else {
      map.current.addSource("similarity-results", {
        type: "geojson",
        data: similaritySource
      });

      map.current.addLayer({
        id: "similarity-results-layer",
        type: "fill",
        source: "similarity-results",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "similarity"],
            0.0, "#ffff00",    // Yellow for low similarity
            0.1, "#ffaa00",    // Orange-yellow
            0.2, "#ff8000",    // Orange  
            0.3, "#ff4000",    // Red-orange
            0.4, "#ff0000"     // Red for high similarity
          ],
          "fill-opacity": 0.5,
          "fill-outline-color": "#FFD700"  // Color blind safe yellow outline
        }
      });
    }

    // Add text labels for similarity scores and tile numbers
    const textFeatures: GeoJSON.Feature[] = finalResults.map((result, index) => {
      const cell = gridCells.find(c => c.id === result.cellId)!;
      const displayText = `#${index + 1}\n${result.cellId}\n${(result.similarity * 100).toFixed(1)}%`;
      
      return {
        type: "Feature",
        properties: {
          similarity: result.similarity,
          rank: index + 1,
          tileNumber: result.cellId,
          displayText: displayText
        },
        geometry: {
          type: "Point",
          coordinates: cell.center
        }
      };
    });


    const textSource: GeoJSON.GeoJSON = {
      type: "FeatureCollection",
      features: textFeatures
    };

    if (map.current.getSource("similarity-text")) {
      (map.current.getSource("similarity-text") as maplibregl.GeoJSONSource).setData(textSource);
    } else {
      map.current.addSource("similarity-text", {
        type: "geojson",
        data: textSource
      });

      map.current.addLayer({
        id: "similarity-text-layer",
        type: "symbol",
        source: "similarity-text",
        layout: {
          "text-field": ["get", "displayText"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": 12,
          "text-anchor": "center",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-line-height": 1.2,
          "text-max-width": 10,
          "visibility": map.current.getZoom() > 23 ? "visible" : "none"
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2
        }
      });
      
    }
    
    // Verify the layer exists after creation
    setTimeout(() => {
      if (map.current) {
        const layer = map.current.getLayer("similarity-results-layer");
        const source = map.current.getSource("similarity-results");
        const textLayer = map.current.getLayer("similarity-text-layer");
        const textSource = map.current.getSource("similarity-text");
        
        if (!layer && source) {
          try {
            map.current.addLayer({
              id: "similarity-results-layer",
              type: "fill",
              source: "similarity-results",
              paint: {
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "similarity"],
                  0.0, "#ffff00",
                  0.1, "#ffaa00",
                  0.2, "#ff8000",
                  0.3, "#ff4000",
                  0.4, "#ff0000"
                ],
                "fill-opacity": 0.3,
                "fill-outline-color": "#FFD700"  // Color blind safe yellow outline
              }
            });
          } catch (err) {
            console.error("Error re-adding similarity layer:", err);
          }
        }

        if (!textLayer && textSource) {
          try {
            map.current.addLayer({
              id: "similarity-text-layer",
              type: "symbol",
              source: "similarity-text",
              layout: {
                "text-field": ["get", "displayText"],
                "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": true,
                "text-ignore-placement": true,
                "text-line-height": 1.2,
                "text-max-width": 10,
                "visibility": map.current.getZoom() > 23 ? "visible" : "none"
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2
              }
            });
          } catch (err) {
            console.error("Error re-adding text layer:", err);
          }
        }
      }
    }, 100);
  };

  // Start drawing with current mode
  const startDrawing = () => {
    if (draw.current) {
      if (drawingMode === 'rectangle') {
        // For rectangle, we'll use polygon mode and guide the user to draw a rectangle
        draw.current.changeMode('draw_polygon');
        alert('Please draw a rectangular polygon by clicking 4 corners and closing the shape.');
      } else {
        draw.current.changeMode('draw_polygon');
      }
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: false,
      mapboxTileStyle: 'satellite',
      maxZoom: 22,
      includeGlyphs: true
    });

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: mapInitConfig.center,
      zoom: zoomLevel,
    });

    // Add draw control with MapLibre-compatible styles
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        line_string: false,
        point: false,
        trash: true,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#3bb2d0',
            'fill-outline-color': '#3bb2d0',
            'fill-opacity': 0.1
          }
        },
        // Polygon fill active
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#fbb03b',
            'fill-outline-color': '#fbb03b',
            'fill-opacity': 0.1
          }
        },
        // Polygon outline stroke
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#3bb2d0',
            'line-width': 2
          }
        },
        // Polygon outline active
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#fbb03b',
            'line-width': 2
          }
        },
        // Vertex points
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#FFF'
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 3,
            'circle-color': '#fbb03b'
          }
        }
      ]
    });
    map.current.addControl(draw.current as any, "top-left");

    // Listen for polygon creation
    map.current.on("draw.create", updatePolygon);
    map.current.on("draw.update", updatePolygon);
    map.current.on("draw.delete", () => setPolygon(null));

    // Listen for map clicks

    // Listen for zoom changes to update text layer visibility
    map.current.on("zoom", updateTextLayerVisibility);
    map.current.on("zoomend", updateTextLayerVisibility);

    // Initialize current zoom level
    map.current.on("load", () => {
      if (map.current) {
        setCurrentMapZoom(map.current.getZoom());
      }
    });

    function updatePolygon() {
      const features = draw.current?.getAll();
      if (features && features.features.length > 0) {
        setPolygon(features.features[0] as GeoJSON.Feature);
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [handleMapClick, updateTextLayerVisibility]); // Removed mapProvider dependency

  // Handle map provider changes by updating the style without recreating the map
  useEffect(() => {
    if (!map.current) return;

    // Store current camera state
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    const currentBearing = map.current.getBearing();
    const currentPitch = map.current.getPitch();

    // Create new style for the selected provider
    const newMapStyle = createBaseMapStyle({
      mapProvider,
      geobaseConfig: GEOBASE_CONFIG,
      mapboxConfig: MAPBOX_CONFIG,
    }, {
      includeMapboxBase: true,
      mapboxTileStyle: 'satellite-v9',
      maxZoom: 23
    });

    // Update the map style while preserving camera state
    map.current.setStyle(newMapStyle, { diff: false });

    // Restore camera state after style loads
    map.current.once('styledata', () => {
      map.current?.setCenter(currentCenter);
      map.current?.setZoom(currentZoom);
      map.current?.setBearing(currentBearing);
      map.current?.setPitch(currentPitch);
    });
  }, [mapProvider]);

  // Initialize model when component mounts
  useEffect(() => {
    let providerParams;
    if (mapProvider === "geobase") {
      providerParams = GEOBASE_CONFIG;
    } else if (mapProvider === "esri") {
      providerParams = ESRI_CONFIG;
    } else {
      providerParams = MAPBOX_CONFIG;
    }

    initializeModel({
      tasks: [{
        task: "mask-generation"
      }],
      providerParams,
    });
  }, [mapProvider, initializeModel]);

  // Update map provider visibility
  useEffect(() => {
    if (!map.current) return;

    const updateLayerVisibility = () => {
      if (!map.current?.isStyleLoaded()) return;
      
      map.current.setLayoutProperty(
        "geobase-layer",
        "visibility",
        mapProvider === "geobase" ? "visible" : "none"
      );
      map.current.setLayoutProperty(
        "mapbox-layer",
        "visibility",
        mapProvider === "mapbox" ? "visible" : "none"
      );
      map.current.setLayoutProperty(
        "esri-layer",
        "visibility",
        mapProvider === "esri" ? "visible" : "none"
      );
    };

    if (map.current.isStyleLoaded()) {
      updateLayerVisibility();
    } else {
      map.current.once('styledata', updateLayerVisibility);
    }
  }, [mapProvider]);

  return (
    <div className="flex h-screen text-black">
      {/* Control Panel */}
      <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
        <h1 className="text-xl font-bold mb-4">Embedding Similarity Search</h1>
        
        {/* Map Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Map Provider:</label>
          <select
            value={mapProvider}
            onChange={(e) => setMapProvider(e.target.value as MapProvider)}
            className="w-full p-2 border border-gray-300 rounded text-black"
          >
            <option value="geobase">Geobase</option>
            <option value="mapbox">Mapbox</option>
            <option value="esri">ESRI</option>
          </select>
        </div>

        {/* Grid Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Grid Size: {gridSize}x{gridSize}
          </label>
          <input
            type="range"
            min="16"
            max="64"
            step="16"
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Zoom Level */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">
            Zoom Level: {zoomLevel} (Current: {currentMapZoom.toFixed(1)})
          </label>
          <input
            type="range"
            min="10"
            max="20"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Drawing Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">Drawing Mode:</label>
          <select
            value={drawingMode}
            onChange={(e) => setDrawingMode(e.target.value as 'rectangle' | 'polygon')}
            className="w-full p-2 border border-gray-300 rounded text-black"
          >
            <option value="rectangle">Rectangle</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>

        {/* Similarity Threshold */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-black">
            Match Sensitivity: {similarityThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <h3 className="font-semibold text-sm mb-2">How to use:</h3>
          <ol className="text-xs space-y-1">
            <li>1. Draw an area on the map</li>
            <li>2. Click "Analyze Area"</li>
            <li>3. Click anywhere to find similar areas</li>
            <li>4. Adjust match sensitivity if needed</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-4">
          <button
            onClick={computeImageEmbeddings}
            disabled={!polygon || isComputingEmbeddings || !isInitialized}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-300"
          >
            {isComputingEmbeddings ? "Computing..." : "Generate Grid & Embeddings"}
          </button>
          
          <button
            onClick={startDrawing}
            disabled={!isInitialized}
            className="w-full bg-green-500 text-white py-2 px-4 rounded disabled:bg-gray-300"
          >
            Start Drawing {drawingMode === 'rectangle' ? 'Rectangle' : 'Polygon'}
          </button>
          
          <button
            onClick={handleReset}
            className="w-full bg-red-500 text-white py-2 px-4 rounded"
          >
            Reset
          </button>
          
          {geoRawImage && (
            <button
              onClick={() => {
                const dataStr = JSON.stringify({
                  bounds: geoRawImage.bounds,
                  width: geoRawImage.width,
                  height: geoRawImage.height,
                  channels: geoRawImage.channels,
                  timestamp: Date.now()
                }, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'geoRawImage_metadata.json';
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded text-xs"
            >
              Export GeoRawImage Metadata
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <div className="text-sm text-black">
            <p className="text-black">AI Ready: {isInitialized ? "✅" : "❌"}</p>
            <p className="text-black">Processing: {isProcessing ? "✅" : "❌"}</p>
            <p className="text-black">Finding Similar Areas: {isComputingSimilarity ? "✅" : "❌"}</p>
            <p className="text-black">Map Zoom: <span className="font-mono text-black">{currentMapZoom.toFixed(2)}</span></p>
            <p className="text-black">Analysis Areas: {gridCells.length}</p>
            <p className="text-black">Data Ready: {imageEmbeddings ? "✅" : "❌"}</p>
            <p className="text-black">Image Data: {geoRawImage ? "✅" : "❌"}</p>
            {imageEmbeddings && geoRawImage && (
              <p className="text-green-600">📊 Ready to analyze</p>
            )}
            {geoRawImage && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p className="text-black"><strong>Image Details:</strong></p>
                <p className="text-black">Size: {geoRawImage.width} x {geoRawImage.height}</p>
                <p className="text-black">Layers: {geoRawImage.channels}</p>
                {geoRawImage.bounds && (
                  <p className="text-black">Area: [{geoRawImage.bounds.west?.toFixed(6)}, {geoRawImage.bounds.south?.toFixed(6)}, {geoRawImage.bounds.east?.toFixed(6)}, {geoRawImage.bounds.north?.toFixed(6)}]</p>
                )}
              </div>
            )}
            {isComputingSimilarity && (
              <p className="text-blue-600">🔍 Finding similar areas...</p>
            )}
          </div>
        </div>

        {/* Similarity Results */}
        {similarityResults.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-black">
              {similarityResults.length} Similar Areas Found
              {selectedPoint && (
                <div className="text-xs text-gray-600 mt-1">
                  Location: [{selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}]
                </div>
              )}
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {similarityResults.map((result, index) => (
                <div 
                  key={result.cellId} 
                  className={`text-xs p-2 rounded cursor-pointer hover:bg-gray-200 text-black ${
                    index < 10 ? 'bg-green-50 border-l-2 border-green-400' : 
                    index < 25 ? 'bg-yellow-50 border-l-2 border-yellow-400' : 
                    'bg-gray-50'
                  }`}
                  onClick={() => {
                    // Zoom to the similar cell
                    if (map.current) {
                      map.current.flyTo({
                        center: result.center,
                        zoom: 19,
                        duration: 1000
                      });
                    }
                  }}
                  title="Click to zoom to this area"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-black">#{index + 1}</span>
                    <span className={`font-bold ${
                      result.similarity > 0.9 ? 'text-red-600' :
                      result.similarity > 0.8 ? 'text-orange-600' :
                      result.similarity > 0.7 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">
                    Location: [{result.center[0].toFixed(6)}, {result.center[1].toFixed(6)}]
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Statistics */}
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-black">
              <div className="grid grid-cols-2 gap-2 text-black">
                <div className="text-black">
                  <strong>Best Match:</strong> {(similarityResults[0]?.similarity * 100 || 0).toFixed(1)}%
                </div>
                <div className="text-black">
                  <strong>Weakest Match:</strong> {(similarityResults[similarityResults.length - 1]?.similarity * 100 || 0).toFixed(1)}%
                </div>
                <div className="text-black">
                  <strong>Average:</strong> {similarityResults.length > 0 ? 
                    ((similarityResults.reduce((sum, r) => sum + r.similarity, 0) / similarityResults.length) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-black">
                  <strong>Good Matches ({(similarityThreshold * 100).toFixed(0)}%+):</strong> {
                    similarityResults.filter(r => r.similarity >= similarityThreshold).length
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />

        <CollapsibleAttribution position="bottom-left" />
      </div>
    </div>
  );
}
