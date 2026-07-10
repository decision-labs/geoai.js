import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Types for our database schema
export interface DetectionSession {
  id: string;
  user_id: string;
  session_name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'failed';
  metadata: Record<string, any>;
}

export interface DetectionResult {
  id: string;
  session_id: string;
  task_type: string;
  confidence_score: number;
  geometry: any; // PostGIS geometry
  properties: Record<string, any>;
  created_at: string;
}

export interface DetectionAnalytics {
  id: string;
  session_id: string;
  task_type: string;
  processing_time_ms: number;
  model_loading_time_ms?: number;
  image_size_pixels?: number;
  zoom_level?: number;
  detection_count: number;
  average_confidence?: number;
  created_at: string;
}

export interface SpatialQueryParams {
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  task?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface HeatmapParams {
  bounds: [number, number, number, number];
  gridSize?: number;
  task?: string;
}

// Supabase service functions
export class SupabaseService {
  // Session management
  static async createSession(sessionData: Omit<DetectionSession, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('aidx_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getSessions(userId?: string) {
    let query = supabase
      .from('aidx_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async updateSession(id: string, updates: Partial<DetectionSession>) {
    const { data, error } = await supabase
      .from('aidx_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSession(id: string) {
    const { error } = await supabase
      .from('aidx_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Detection results management
  static async saveDetectionResults(results: Omit<DetectionResult, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('aidx_results')
      .insert(results)
      .select();

    if (error) throw error;
    return data;
  }

  static async getDetectionResults(sessionId: string) {
    const { data, error } = await supabase
      .from('aidx_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getDetectionResultsForSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('aidx_results')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getSpatialQuery(params: SpatialQueryParams) {
    const [minLng, minLat, maxLng, maxLat] = params.bounds;
    
    const { data, error } = await supabase.rpc('aidx_get_detections_in_bounds', {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      task_filter: params.task || undefined,
      date_from: params.dateFrom || undefined,
      date_to: params.dateTo || undefined
    });

    if (error) throw error;
    return data;
  }

  static async getDetectionHeatmap(params: HeatmapParams) {
    const [minLng, minLat, maxLng, maxLat] = params.bounds;
    
    const { data, error } = await supabase.rpc('aidx_get_detection_heatmap', {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      grid_size: params.gridSize || 100,
      task_filter: params.task || undefined
    });

    if (error) throw error;
    return data;
  }

  // Analytics management
  static async saveAnalytics(analytics: Omit<DetectionAnalytics, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('aidx_analytics')
      .insert([analytics])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getSessionStats(sessionId: string) {
    const { data, error } = await supabase.rpc('aidx_get_detection_stats', {
      session_uuid: sessionId
    });

    if (error) throw error;
    return data;
  }

  static async getAnalyticsForSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return [];

    const { data, error } = await supabase
      .from('aidx_analytics')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getPublicStats() {
    const { data, error } = await supabase
      .from('aidx_public_stats')
      .select('*')
      .order('detection_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  // Authentication helpers
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Real-time subscriptions
  static subscribeToDetectionResults(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`aidx_results_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aidx_results',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  }

  static subscribeToSessions(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`sessions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aidx_sessions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
}

// Utility functions for GeoJSON conversion
export class GeoJSONUtils {
  static detectionResultToGeoJSON(result: DetectionResult): GeoJSON.Feature {
    return {
      type: 'Feature',
      id: result.id,
      properties: {
        ...result.properties,
        task_type: result.task_type,
        confidence_score: result.confidence_score,
        session_id: result.session_id,
        created_at: result.created_at
      },
      geometry: result.geometry
    };
  }

  static detectionResultsToFeatureCollection(results: DetectionResult[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: results.map(result => this.detectionResultToGeoJSON(result))
    };
  }

  static async convertGeometryToGeoJSON(geometry: any): Promise<GeoJSON.Geometry> {
    // This would typically involve calling a PostGIS function to convert geometry to GeoJSON
    // For now, we'll assume the geometry is already in the correct format
    return geometry;
  }
}

