import { useState, useCallback, useRef } from 'react';
import { geoai, ProviderParams } from 'geoai';
import { SupabaseService } from '../lib/supabase';

// Type for the pipeline instance returned by geoai.pipeline
interface PipelineInstance {
  inference: (params: {
    inputs: {
      polygon: GeoJSON.Feature;
      classLabel?: string;
    };
    mapSourceParams?: {
      zoomLevel?: number;
      bands?: number[];
      expression?: string;
    };
    postProcessingParams?: {
      confidence?: number;
      threshold?: number;
      topk?: number;
      [key: string]: unknown;
    };
  }) => Promise<PipelineInferenceOutput>;
}

interface DetectionInferenceOutput {
  detections: GeoJSON.FeatureCollection;
  geoRawImage: unknown;
}

interface EmbeddingInferenceOutput {
  features: number[][];
  similarityMatrix: number[][];
  patchSize: number;
  geoRawImage: unknown;
  metadata?: {
    numPatches?: number;
    featureDimensions?: number;
  };
}

type PipelineInferenceOutput = DetectionInferenceOutput | EmbeddingInferenceOutput;

interface GeoRawImageLike {
  width?: number;
  height?: number;
  bounds?: {
    west: number;
    east: number;
    north: number;
    south: number;
  };
  getBounds?: () => {
    west: number;
    east: number;
    north: number;
    south: number;
  };
}

export interface DetectionTask {
  task: string;
  modelId?: string;
  confidence?: number;
  threshold?: number;
  topk?: number;
  classLabel?: string | string[];
}

export interface DetectionParams {
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  tasks: DetectionTask[];
  mapSourceParams?: {
    zoomLevel?: number;
    bands?: number[];
    expression?: string;
  };
  postProcessingParams?: {
    confidenceThreshold?: number;
    nmsThreshold?: number;
    threshold?: number;
    topk?: number;
  };
}

export interface DetectionResult {
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

export interface UseGeoAIOptions {
  provider: 'esri' | 'mapbox' | 'geobase' | 'google';
  providerParams?: Partial<ProviderParams>;
  geobaseConfig?: GeobaseConfig | null;
  autoSave?: boolean;
  sessionName?: string;
}

interface GeobaseConfig {
  projectRef: string;
  cogImageryUrl: string;
  apiKey: string;
}

export function useGeoAI(options: UseGeoAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [results, setResults] = useState<DetectionResult[]>([]);
  
  const pipelineRef = useRef<{ pipeline: PipelineInstance; cacheKey: string } | null>(null);
  const modelLoadingTimesRef = useRef<Record<string, number>>({});

  const buildEmbeddingFeatures = useCallback((
    result: EmbeddingInferenceOutput,
    polygon: GeoJSON.Feature<GeoJSON.Polygon>
  ): GeoJSON.FeatureCollection => {
    const geoRawImage = result.geoRawImage as GeoRawImageLike;
    if (!geoRawImage?.width || !geoRawImage.height || !result.patchSize) {
      return { type: 'FeatureCollection', features: [] };
    }

    const bounds = geoRawImage.getBounds?.() || geoRawImage.bounds || (() => {
      const ring = polygon.geometry.coordinates[0] || [];
      let west = Number.POSITIVE_INFINITY;
      let east = Number.NEGATIVE_INFINITY;
      let north = Number.NEGATIVE_INFINITY;
      let south = Number.POSITIVE_INFINITY;

      for (const [lon, lat] of ring) {
        if (lon < west) west = lon;
        if (lon > east) east = lon;
        if (lat > north) north = lat;
        if (lat < south) south = lat;
      }

      return { west, east, north, south };
    })();
    const patchesPerRow = Math.ceil(geoRawImage.width / result.patchSize);
    const patchesPerCol = Math.ceil(geoRawImage.height / result.patchSize);
    const maxPatchCount = patchesPerRow * patchesPerCol;
    const patchCount = Math.min(result.features.length, maxPatchCount);

    if (patchCount === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const lonStep = (bounds.east - bounds.west) / patchesPerRow;
    const latStep = (bounds.north - bounds.south) / patchesPerCol;

    const features: GeoJSON.Feature[] = [];
    for (let idx = 0; idx < patchCount; idx += 1) {
      const row = Math.floor(idx / patchesPerRow);
      const col = idx % patchesPerRow;
      const patchWest = bounds.west + col * lonStep;
      const patchEast = bounds.west + (col + 1) * lonStep;
      const patchNorth = bounds.north - row * latStep;
      const patchSouth = bounds.north - (row + 1) * latStep;
      const vector = result.features[idx] || [];
      const embeddingVector = vector.map((value) => (Number.isFinite(value) ? value : 0));
      const embeddingNormRaw = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      const embeddingNorm = Number.isFinite(embeddingNormRaw) ? embeddingNormRaw : 0;
      const similarities = (result.similarityMatrix[idx] || []).map((value) =>
        Number.isFinite(value) ? value : 0
      );

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [patchWest, patchNorth],
            [patchEast, patchNorth],
            [patchEast, patchSouth],
            [patchWest, patchSouth],
            [patchWest, patchNorth]
          ]]
        },
        properties: {
          patch_index: idx,
          embedding_norm: embeddingNorm,
          similarities,
          embedding_vector: embeddingVector
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }, []);

  // Initialize the GeoAI pipeline with tasks
  const initializePipeline = useCallback(async (tasks: DetectionTask[]) => {
    // Validate tasks parameter
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Tasks array is required and cannot be empty');
    }

    // Create a cache key based on provider and tasks
    const cacheKey = `${options.provider}_${tasks
      .map((task) => `${task.task}:${task.modelId || 'default'}`)
      .sort()
      .join('_')}`;
    
    // Return cached pipeline if it exists for these tasks
    if (pipelineRef.current && pipelineRef.current.cacheKey === cacheKey) {
      return pipelineRef.current.pipeline;
    }

    try {
      setIsLoading(true);
      setError(null);

      const providerConfig: ProviderParams = {
        provider: options.provider,
        ...options.providerParams
      };

      // Add provider-specific configurations
      if (options.provider === 'esri') {
        providerConfig.serviceUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services';
        providerConfig.serviceName = 'World_Imagery';
        providerConfig.tileSize = 256;
        providerConfig.attribution = 'ESRI World Imagery';
      } else if (options.provider === 'geobase') {
        if (!options.geobaseConfig) {
          throw new Error('Geobase configuration is required when using Geobase provider');
        }
        providerConfig.projectRef = options.geobaseConfig.projectRef;
        providerConfig.apikey = options.geobaseConfig.apiKey;
        providerConfig.cogImagery = options.geobaseConfig.cogImageryUrl;
      } else if (options.provider === 'mapbox') {
        providerConfig.apiKey = import.meta.env.VITE_MAPBOX_TOKEN;
        providerConfig.style = 'mapbox://styles/mapbox/satellite-v9';
      }

      // Convert DetectionTask[] to TaskConfig[] format expected by geoai.pipeline
      const taskConfigs = tasks.map(task => ({
        task: task.task,
        modelId: task.modelId,
        modelParams: undefined // Use default model params
      }));

      console.log('🔧 Creating pipeline with configs:', {
        taskConfigs: taskConfigs.map(tc => ({ task: tc.task, modelId: tc.modelId })),
        providerConfig: { provider: providerConfig.provider }
      });
      
      const pipeline = await geoai.pipeline(taskConfigs, providerConfig);
      console.log('✅ Pipeline created successfully');

      // Cache the pipeline with its cache key
      pipelineRef.current = {
        pipeline,
        cacheKey
      };
      
      return pipeline;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize GeoAI pipeline';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.provider, options.providerParams]);

  // Create a new detection session
  const createSession = useCallback(async (sessionName?: string) => {
    try {
      console.log('🔄 Creating new detection session...');
      
      const user = await SupabaseService.getCurrentUser();
      console.log('👤 Current user:', user ? { id: user.id, email: user.email } : 'Not authenticated');
      
      if (!user) throw new Error('User not authenticated');

      const sessionData = {
        user_id: user.id,
        session_name: sessionName || options.sessionName || `Detection Session ${new Date().toLocaleString()}`,
        description: `AI detection session using ${options.provider} provider`,
        status: 'active' as const,
        metadata: {
          provider: options.provider,
          providerParams: options.providerParams,
          created_at: new Date().toISOString()
        }
      };

      console.log('📝 Session data to create:', sessionData);

      const session = await SupabaseService.createSession(sessionData);
      console.log('✅ Session created successfully:', session);

      setCurrentSession(session.id);
      return session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      console.error('❌ Failed to create session:', err);
      setError(errorMessage);
      throw err;
    }
  }, [options.provider, options.providerParams, options.sessionName]);

  // Run detection on a polygon
  const detectObjects = useCallback(async (params: DetectionParams): Promise<DetectionResult[]> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Starting detection process...', {
        autoSave: options.autoSave,
        currentSession,
        provider: options.provider,
        taskCount: params.tasks.length
      });

      // Initialize pipeline with the specific tasks
      const pipeline = await initializePipeline(params.tasks);

      // Create session if auto-save is enabled and no current session
      let sessionToUse = currentSession;
      if (options.autoSave && !currentSession) {
        console.log('🔄 Auto-save enabled but no session exists - creating new session...');
        try {
          const newSession = await createSession();
          sessionToUse = newSession.id;
          console.log('✅ New session ready for auto-save:', sessionToUse);
        } catch (sessionError) {
          console.error('❌ Failed to create session for auto-save:', sessionError);
          // Continue with detection even if session creation fails
        }
      } else if (options.autoSave && currentSession) {
        console.log('✅ Auto-save enabled and session exists:', currentSession);
      }

      const detectionResults: DetectionResult[] = [];
      const startTime = performance.now();
      const buildDetectionResult = (
        task: string,
        result: PipelineInferenceOutput,
        processingTime: number,
        modelLoadingTime: number
      ): DetectionResult => {
        if ('detections' in result) {
          return {
            task,
            detections: result.detections,
            geoRawImage: result.geoRawImage,
            processingTime,
            modelLoadingTime
          };
        }

        // image-feature-extraction returns embeddings/similarity data instead of polygon detections.
        return {
          task,
          detections: buildEmbeddingFeatures(result, params.polygon),
          geoRawImage: result.geoRawImage,
          processingTime,
          modelLoadingTime,
          embeddingSummary: {
            numEmbeddings: result.features.length,
            patchSize: result.patchSize,
            featureDimensions: result.metadata?.featureDimensions
          }
        };
      };

      // For single task, run inference directly
      if (params.tasks.length === 1) {
        const taskConfig = params.tasks[0];
        const taskStartTime = performance.now();
        
        try {
          // Check if model is already loaded
          const modelKey = `${options.provider}_${taskConfig.task}_${taskConfig.modelId || 'default'}`;
          const modelLoadingStartTime = performance.now();

          // Run inference with the task-specific parameters
          console.log('🔍 Running inference for task:', taskConfig.task);
          console.log('🔍 Inference parameters:', {
            polygon: params.polygon,
            classLabel: taskConfig.classLabel,
            confidence: taskConfig.confidence,
            threshold: taskConfig.threshold,
            topk: taskConfig.topk
          });
          
          const result = await pipeline.inference({
            inputs: {
              polygon: params.polygon,
              classLabel: taskConfig.classLabel
            },
            mapSourceParams: params.mapSourceParams,
            postProcessingParams: {
              confidence: taskConfig.confidence,
              threshold: taskConfig.threshold,
              topk: taskConfig.topk,
              similarityThreshold: taskConfig.task === 'image-feature-extraction' ? taskConfig.confidence : undefined,
              ...params.postProcessingParams
            }
          });
          
          console.log('✅ Inference completed for task:', taskConfig.task);
          console.log('📊 Inference result:', {
            outputType: 'detections' in result ? 'detections' : 'embeddings',
            detectionsCount: 'detections' in result ? result.detections.features.length : 0,
            embeddingsCount: 'features' in result ? result.features.length : undefined,
            hasGeoRawImage: !!result.geoRawImage
          });

          const modelLoadingTime = performance.now() - modelLoadingStartTime;
          const processingTime = performance.now() - taskStartTime;

          // Store model loading time for first load
          if (!modelLoadingTimesRef.current[modelKey]) {
            modelLoadingTimesRef.current[modelKey] = modelLoadingTime;
          }

          const detectionResult = buildDetectionResult(
            taskConfig.task,
            result,
            processingTime,
            modelLoadingTimesRef.current[modelKey]
          );

          detectionResults.push(detectionResult);

          // Auto-save to Supabase if enabled
          if (options.autoSave && taskConfig.task !== 'image-feature-extraction') {
            if (sessionToUse) {
              console.log('💾 Auto-saving detection results to session:', sessionToUse);
              await saveDetectionResults(detectionResult, sessionToUse);
            } else {
              console.warn('⚠️ Auto-save enabled but no session available - results will not be saved');
            }
          } else {
            console.log('ℹ️ Auto-save is disabled - results will not be saved');
          }

        } catch (taskError) {
          console.error(`❌ Error in task ${taskConfig.task}:`, taskError);
          console.error('❌ Task configuration:', taskConfig);
          console.error('❌ Error details:', {
            message: taskError instanceof Error ? taskError.message : 'Unknown error',
            stack: taskError instanceof Error ? taskError.stack : undefined,
            name: taskError instanceof Error ? taskError.name : undefined
          });
          throw taskError; // Re-throw for single task failures
        }
      } else {
        // For multiple tasks, we need to run them individually since the current pipeline
        // doesn't support multiple independent tasks in one call
        for (const taskConfig of params.tasks) {
          const taskStartTime = performance.now();
          
          try {
            // Initialize pipeline for this specific task
            const taskPipeline = await initializePipeline([taskConfig]);
            
            // Check if model is already loaded
            const modelKey = `${options.provider}_${taskConfig.task}_${taskConfig.modelId || 'default'}`;
            const modelLoadingStartTime = performance.now();

            // Run inference
            const result = await taskPipeline.inference({
              inputs: {
                polygon: params.polygon,
                classLabel: taskConfig.classLabel
              },
              mapSourceParams: params.mapSourceParams,
              postProcessingParams: {
                confidence: taskConfig.confidence,
                threshold: taskConfig.threshold,
                topk: taskConfig.topk,
                similarityThreshold: taskConfig.task === 'image-feature-extraction' ? taskConfig.confidence : undefined,
                ...params.postProcessingParams
              }
            });

            const modelLoadingTime = performance.now() - modelLoadingStartTime;
            const processingTime = performance.now() - taskStartTime;

            // Store model loading time for first load
            if (!modelLoadingTimesRef.current[modelKey]) {
              modelLoadingTimesRef.current[modelKey] = modelLoadingTime;
            }

            const detectionResult = buildDetectionResult(
              taskConfig.task,
              result,
              processingTime,
              modelLoadingTimesRef.current[modelKey]
            );

            detectionResults.push(detectionResult);

            // Auto-save to Supabase if enabled
          if (options.autoSave && taskConfig.task !== 'image-feature-extraction') {
              if (sessionToUse) {
                console.log('💾 Auto-saving detection results to session:', sessionToUse);
                await saveDetectionResults(detectionResult, sessionToUse);
              } else {
                console.warn('⚠️ Auto-save enabled but no session available - results will not be saved');
              }
            } else {
              console.log('ℹ️ Auto-save is disabled - results will not be saved');
            }

          } catch (taskError) {
            console.error(`Error in task ${taskConfig.task}:`, taskError);
            // Continue with other tasks even if one fails
          }
        }
      }

      const totalTime = performance.now() - startTime;
      console.log(`Total detection time: ${totalTime.toFixed(2)}ms`);

      setResults(prev => [...prev, ...detectionResults]);
      return detectionResults;

    } catch (err) {
      console.error('❌ Detection failed with error:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });
      console.error('❌ Detection parameters:', {
        taskCount: params.tasks.length,
        tasks: params.tasks.map(t => ({ task: t.task, confidence: t.confidence })),
        autoSave: options.autoSave,
        currentSession
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Detection failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [buildEmbeddingFeatures, initializePipeline, options.autoSave, currentSession, createSession]);

  // Save detection results to Supabase
  const saveDetectionResults = useCallback(async (result: DetectionResult, sessionId: string) => {
    try {
      if (result.task === 'image-feature-extraction') {
        console.log('ℹ️ Skipping DB save for image-feature-extraction (embeddings visualization task)');
        return;
      }

      console.log('🔄 Attempting to save detection results...', {
        sessionId,
        taskType: result.task,
        detectionCount: result.detections.features.length
      });

      if (!result.detections.features.length) {
        console.log('⚠️ No detections to save, skipping...');
        return;
      }

      // Convert GeoJSON features to database format
      const detectionResults = result.detections.features.map(feature => {
        // Convert geometry to MultiPolygon format if it's a Polygon
        let geometry = feature.geometry;
        if (geometry.type === 'Polygon') {
          console.log('🔄 Converting Polygon to MultiPolygon for database storage');
          geometry = {
            type: 'MultiPolygon',
            coordinates: [geometry.coordinates]
          };
        } else if (geometry.type === 'MultiPolygon') {
          console.log('✅ Geometry is already MultiPolygon format');
        } else {
          console.log('⚠️ Unexpected geometry type:', geometry.type);
        }
        
        return {
          session_id: sessionId,
          task_type: result.task,
          confidence_score: feature.properties?.confidence || feature.properties?.score || 0.5,
          geometry: geometry,
          properties: {
            ...feature.properties,
            processing_time_ms: result.processingTime,
            model_loading_time_ms: result.modelLoadingTime
          }
        };
      });

      console.log('📊 Detection results to save:', detectionResults);

      // Save detection results
      const savedResults = await SupabaseService.saveDetectionResults(detectionResults);
      console.log('✅ Detection results saved successfully:', savedResults);

      // Save analytics
      const analytics = {
        session_id: sessionId,
        task_type: result.task,
        processing_time_ms: Math.round(result.processingTime),
        model_loading_time_ms: result.modelLoadingTime ? Math.round(result.modelLoadingTime) : undefined,
        detection_count: result.detections.features.length,
        average_confidence: result.detections.features.length > 0 
          ? result.detections.features.reduce((sum, f) => sum + (f.properties?.confidence || f.properties?.score || 0.5), 0) / result.detections.features.length
          : 0,
        zoom_level: undefined
      };

      const savedAnalytics = await SupabaseService.saveAnalytics(analytics);
      console.log('✅ Analytics saved successfully:', savedAnalytics);

    } catch (err) {
      console.error('❌ Failed to save detection results:', err);
      
      // Check for specific geometry type errors
      if (err instanceof Error && err.message.includes('Geometry type')) {
        console.error('🔧 Geometry type mismatch detected. This usually means:');
        console.error('   - Database expects POLYGON but received MultiPolygon');
        console.error('   - Run the geometry type migration in your database');
        console.error('   - Or update the database schema to accept GEOMETRY(GEOMETRY, 4326)');
      }
      
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        sessionId,
        taskType: result.task,
        detectionCount: result.detections.features.length
      });
      // Don't throw here to avoid breaking the detection flow
    }
  }, []);

  // Get detection history for current session
  const getDetectionHistory = useCallback(async (sessionId?: string) => {
    try {
      const sessionToUse = sessionId || currentSession;
      if (!sessionToUse) throw new Error('No session ID provided');

      const results = await SupabaseService.getDetectionResults(sessionToUse);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get detection history';
      setError(errorMessage);
      throw err;
    }
  }, [currentSession]);

  // Get spatial query results
  const getSpatialQuery = useCallback(async (bounds: [number, number, number, number], task?: string) => {
    try {
      const results = await SupabaseService.getSpatialQuery({
        bounds,
        task
      });
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get spatial query results';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get detection heatmap
  const getDetectionHeatmap = useCallback(async (bounds: [number, number, number, number], task?: string) => {
    try {
      const heatmap = await SupabaseService.getDetectionHeatmap({
        bounds,
        task
      });
      return heatmap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get detection heatmap';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Clear current results
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // Reset pipeline
  const resetPipeline = useCallback(() => {
    pipelineRef.current = null;
    modelLoadingTimesRef.current = {};
    setCurrentSession(null);
    clearResults();
  }, [clearResults]);

  return {
    // State
    isLoading,
    error,
    currentSession,
    results,
    
    // Actions
    initializePipeline,
    createSession,
    detectObjects,
    saveDetectionResults,
    getDetectionHistory,
    getSpatialQuery,
    getDetectionHeatmap,
    clearResults,
    resetPipeline,
    
    // Utilities
    isInitialized: !!pipelineRef.current?.pipeline,
    hasResults: results.length > 0
  };
}
