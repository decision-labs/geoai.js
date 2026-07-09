-- Final fix for geometry type issues
-- This handles the conversion properly

-- Step 1: Drop constraints and index
DROP INDEX IF EXISTS idx_aidx_results_geometry;
ALTER TABLE aidx_results DROP CONSTRAINT IF EXISTS valid_geometry;

-- Step 2: Add a temporary column with MultiPolygon type
ALTER TABLE aidx_results 
ADD COLUMN geometry_temp GEOMETRY(MultiPolygon, 4326);

-- Step 3: Convert existing Polygon data to MultiPolygon in the temp column
UPDATE aidx_results 
SET geometry_temp = ST_Multi(geometry);

-- Step 4: Drop the old geometry column
ALTER TABLE aidx_results 
DROP COLUMN geometry;

-- Step 5: Rename the temp column to geometry
ALTER TABLE aidx_results 
RENAME COLUMN geometry_temp TO geometry;

-- Step 6: Recreate constraints and index
ALTER TABLE aidx_results 
ADD CONSTRAINT valid_geometry CHECK (ST_IsValid(geometry));

CREATE INDEX IF NOT EXISTS idx_aidx_results_geometry 
ON aidx_results USING GIST (geometry);

-- Step 7: Verify the fix
SELECT 
  ST_GeometryType(geometry) as geom_type,
  COUNT(*) as count
FROM aidx_results 
GROUP BY ST_GeometryType(geometry);
