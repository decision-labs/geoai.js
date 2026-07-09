-- Add search_path to all PostGIS functions to ensure they can find extensions schema
-- This fixes the ST_Transform error by setting the search path within each function

-- Update aidx_get_detection_stats function
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

-- Update aidx_get_detections_in_bounds function
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

-- Update aidx_get_detection_heatmap function
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

