export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      aidx_analytics: {
        Row: {
          id: string
          session_id: string
          task_type: string
          processing_time_ms: number
          model_loading_time_ms: number | null
          image_size_pixels: number | null
          zoom_level: number | null
          detection_count: number
          average_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          task_type: string
          processing_time_ms: number
          model_loading_time_ms?: number | null
          image_size_pixels?: number | null
          zoom_level?: number | null
          detection_count?: number
          average_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          task_type?: string
          processing_time_ms?: number
          model_loading_time_ms?: number | null
          image_size_pixels?: number | null
          zoom_level?: number | null
          detection_count?: number
          average_confidence?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aidx_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "aidx_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      aidx_results: {
        Row: {
          id: string
          session_id: string
          task_type: string
          confidence_score: number
          geometry: unknown
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          task_type: string
          confidence_score: number
          geometry: unknown
          properties?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          task_type?: string
          confidence_score?: number
          geometry?: unknown
          properties?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aidx_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "aidx_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      aidx_sessions: {
        Row: {
          id: string
          user_id: string
          session_name: string
          description: string | null
          created_at: string
          updated_at: string
          status: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          session_name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          session_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "aidx_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      aidx_public_stats: {
        Row: {
          task_type: string | null
          total_detections: number | null
          avg_confidence: number | null
          detection_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aidx_get_detection_heatmap: {
        Args: {
          min_lng: number
          min_lat: number
          max_lng: number
          max_lat: number
          grid_size?: number
          task_filter?: string
        }
        Returns: {
          grid_id: number | null
          center_lng: number | null
          center_lat: number | null
          detection_count: number | null
          avg_confidence: number | null
        }[]
      }
      aidx_get_detection_stats: {
        Args: {
          session_uuid: string
        }
        Returns: {
          task_type: string | null
          total_detections: number | null
          avg_confidence: number | null
          min_confidence: number | null
          max_confidence: number | null
          total_area_sq_meters: number | null
        }[]
      }
      aidx_get_detections_in_bounds: {
        Args: {
          min_lng: number
          min_lat: number
          max_lng: number
          max_lat: number
          task_filter?: string
          date_from?: string
          date_to?: string
        }
        Returns: {
          id: string | null
          session_id: string | null
          task_type: string | null
          confidence_score: number | null
          geometry: unknown
          properties: Json | null
          created_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
