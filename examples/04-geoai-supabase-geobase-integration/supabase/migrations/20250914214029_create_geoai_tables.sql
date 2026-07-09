-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Create aidx_sessions table
CREATE TABLE IF NOT EXISTS aidx_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create aidx_results table with PostGIS geometry
CREATE TABLE IF NOT EXISTS aidx_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES aidx_sessions(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Spatial index for efficient geospatial queries
    CONSTRAINT valid_geometry CHECK (ST_IsValid(geometry))
);

-- Create aidx_analytics table for performance metrics
CREATE TABLE IF NOT EXISTS aidx_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES aidx_sessions(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    model_loading_time_ms INTEGER,
    image_size_pixels INTEGER,
    zoom_level INTEGER,
    detection_count INTEGER DEFAULT 0,
    average_confidence DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aidx_results_geometry 
ON aidx_results USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_aidx_results_session_id 
ON aidx_results (session_id);

CREATE INDEX IF NOT EXISTS idx_aidx_results_task_type 
ON aidx_results (task_type);

CREATE INDEX IF NOT EXISTS idx_aidx_results_created_at 
ON aidx_results (created_at);

CREATE INDEX IF NOT EXISTS idx_aidx_sessions_user_id 
ON aidx_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_aidx_sessions_created_at 
ON aidx_sessions (created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION aidx_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER aidx_update_sessions_updated_at 
    BEFORE UPDATE ON aidx_sessions 
    FOR EACH ROW EXECUTE FUNCTION aidx_update_updated_at_column();

-- Create a function to calculate detection statistics
CREATE OR REPLACE FUNCTION aidx_get_detection_stats(session_uuid UUID)
RETURNS TABLE (
    task_type VARCHAR(100),
    total_detections BIGINT,
    avg_confidence DECIMAL(5,4),
    min_confidence DECIMAL(5,4),
    max_confidence DECIMAL(5,4),
    total_area_sq_meters DECIMAL
) AS $$
BEGIN
    -- Set search path to include extensions schema for PostGIS functions
    SET search_path = public, extensions;
    
    RETURN QUERY
    SELECT 
        dr.task_type,
        COUNT(*) as total_detections,
        ROUND(AVG(dr.confidence_score)::numeric, 4) as avg_confidence,
        ROUND(MIN(dr.confidence_score)::numeric, 4) as min_confidence,
        ROUND(MAX(dr.confidence_score)::numeric, 4) as max_confidence,
        ROUND(SUM(ST_Area(ST_Transform(dr.geometry, 3857)))::numeric, 2) as total_area_sq_meters
    FROM aidx_results dr
    WHERE dr.session_id = session_uuid
    GROUP BY dr.task_type
    ORDER BY total_detections DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function for spatial queries
CREATE OR REPLACE FUNCTION aidx_get_detections_in_bounds(
    min_lng DECIMAL,
    min_lat DECIMAL,
    max_lng DECIMAL,
    max_lat DECIMAL,
    task_filter VARCHAR(100) DEFAULT NULL,
    date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    task_type VARCHAR(100),
    confidence_score DECIMAL(5,4),
    geometry GEOMETRY(POLYGON, 4326),
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Set search path to include extensions schema for PostGIS functions
    SET search_path = public, extensions;
    
    RETURN QUERY
    SELECT 
        dr.id,
        dr.session_id,
        dr.task_type,
        dr.confidence_score,
        dr.geometry,
        dr.properties,
        dr.created_at
    FROM aidx_results dr
    WHERE 
        ST_Intersects(
            dr.geometry, 
            ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        )
        AND (task_filter IS NULL OR dr.task_type = task_filter)
        AND (date_from IS NULL OR dr.created_at >= date_from)
        AND (date_to IS NULL OR dr.created_at <= date_to)
    ORDER BY dr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get detection heatmap data
CREATE OR REPLACE FUNCTION aidx_get_detection_heatmap(
    min_lng DECIMAL,
    min_lat DECIMAL,
    max_lng DECIMAL,
    max_lat DECIMAL,
    grid_size INTEGER DEFAULT 100,
    task_filter VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    grid_id INTEGER,
    center_lng DECIMAL,
    center_lat DECIMAL,
    detection_count BIGINT,
    avg_confidence DECIMAL(5,4)
) AS $$
DECLARE
    lng_step DECIMAL;
    lat_step DECIMAL;
BEGIN
    -- Set search path to include extensions schema for PostGIS functions
    SET search_path = public, extensions;
    
    lng_step := (max_lng - min_lng) / grid_size;
    lat_step := (max_lat - min_lat) / grid_size;
    
    RETURN QUERY
    SELECT 
        (FLOOR((ST_X(ST_Centroid(dr.geometry)) - min_lng) / lng_step) * grid_size + 
         FLOOR((ST_Y(ST_Centroid(dr.geometry)) - min_lat) / lat_step))::INTEGER as grid_id,
        ROUND((min_lng + (FLOOR((ST_X(ST_Centroid(dr.geometry)) - min_lng) / lng_step) + 0.5) * lng_step)::numeric, 6) as center_lng,
        ROUND((min_lat + (FLOOR((ST_Y(ST_Centroid(dr.geometry)) - min_lat) / lat_step) + 0.5) * lat_step)::numeric, 6) as center_lat,
        COUNT(*) as detection_count,
        ROUND(AVG(dr.confidence_score)::numeric, 4) as avg_confidence
    FROM aidx_results dr
    WHERE 
        ST_Intersects(
            dr.geometry, 
            ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
        )
        AND (task_filter IS NULL OR dr.task_type = task_filter)
    GROUP BY grid_id, center_lng, center_lat
    ORDER BY detection_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE aidx_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aidx_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE aidx_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view their own AIDX sessions" ON aidx_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AIDX sessions" ON aidx_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AIDX sessions" ON aidx_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AIDX sessions" ON aidx_sessions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view AIDX results from their sessions" ON aidx_results
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM aidx_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert AIDX results to their sessions" ON aidx_results
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM aidx_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view AIDX analytics from their sessions" ON aidx_analytics
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM aidx_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert AIDX analytics to their sessions" ON aidx_analytics
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM aidx_sessions WHERE user_id = auth.uid()
        )
    );

-- Table privileges for Supabase API roles (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON aidx_sessions TO authenticated;
GRANT SELECT, INSERT ON aidx_results TO authenticated;
GRANT SELECT, INSERT ON aidx_analytics TO authenticated;

-- Create a per-user stats view (scoped via session ownership)
CREATE VIEW aidx_public_stats
WITH (security_invoker = true) AS
SELECT 
    dr.task_type,
    COUNT(*) as total_detections,
    ROUND(AVG(dr.confidence_score)::numeric, 4) as avg_confidence,
    DATE_TRUNC('day', dr.created_at) as detection_date
FROM aidx_results dr
JOIN aidx_sessions s ON s.id = dr.session_id
WHERE s.user_id = auth.uid()
GROUP BY dr.task_type, DATE_TRUNC('day', dr.created_at)
ORDER BY detection_date DESC;

-- Authenticated users only; RLS on underlying tables applies via security_invoker
GRANT SELECT ON aidx_public_stats TO authenticated;

-- Sample data removed to avoid foreign key constraint issues
-- In production, data will be inserted through the application with valid user IDs
