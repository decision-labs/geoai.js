# GeoAI.js + Supabase + Geobase Integration

A complete full-stack application demonstrating how to integrate GeoAI.js with Supabase and Geobase for storing and managing geospatial AI detection results in real-time.

## 🚀 Features

- **Multi-Task AI Detection**: Oil tanks, solar panels, buildings, and more
- **Real-time Storage**: Automatic saving to Supabase with PostGIS
- **Interactive Map**: Draw polygons and see results instantly
- **Historical Data**: View and analyze past detection results
- **Performance Analytics**: Track detection metrics and performance
- **Export Capabilities**: Download results as GeoJSON or CSV

## 🏗️ Architecture

This example supports two backend options with different capabilities:

### Option 1: Standard Supabase Backend
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │   GeoAI.js      │    │   Supabase      │
│                 │    │                 │    │                 │
│ • Interactive   │◄──►│ • AI Models     │◄──►│ • PostGIS DB    │
│   Map           │    │ • Detection     │    │ • Real-time     │
│ • GeoJSON Layers│    │ • Processing    │    │ • Auth          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Option 2: Geobase Backend (Enhanced)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │   GeoAI.js      │    │    Geobase      │
│                 │    │                 │    │                 │
│ • Interactive   │◄──►│ • AI Models     │◄──►│ • PostGIS DB    │
│   Map           │    │ • Detection     │    │ • Real-time     │
│ • Vector Tiles  │    │ • Processing    │    │ • Auth          │
│ • Tileserver    │    │                 │    │ • Vector Tiles  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🚀 Geobase Advantages:
- **Vector Tileserver**: Efficient rendering of thousands of detection results
- **High Performance**: Optimized geospatial data delivery via vector tiles  
- **Auto-styling**: Color-coded detection results by task type
- **Interactive**: Click handlers and popups on vector tiles
- **Scalable**: Handles large datasets without performance degradation

## 🗺️ Map Providers

This application supports multiple map providers:

### ESRI (Default - Free)
- **Service**: ESRI World Imagery
- **Cost**: Free
- **Quality**: High-resolution satellite imagery
- **No configuration required**

### Mapbox
- **Service**: Mapbox Satellite
- **Cost**: Requires API key
- **Quality**: High-resolution satellite imagery
- **Configuration**: Set `VITE_MAPBOX_TOKEN` in `.env.local`

### Geobase (Enhanced)
- **Service**: Custom Geobase tileserver and imagery
- **Cost**: Requires Geobase account
- **Quality**: Custom imagery and vector tileserver
- **Configuration**: Interactive configuration modal
- **Features**: 
  - Custom tileserver URL for vector tiles
  - Custom imagery URL for satellite imagery
  - API key authentication
  - Real-time configuration

### Google Maps
- **Service**: Google Maps Satellite
- **Cost**: Requires API key
- **Quality**: High-resolution satellite imagery
- **Configuration**: Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`

## 🔧 Geobase Provider Configuration

When selecting the Geobase provider, you'll be prompted to configure:

1. **Project Reference**: Your Geobase project identifier (e.g., `loxsednpecspovfimsxq`)
2. **COG Imagery URL**: Direct URL to your COG (Cloud Optimized GeoTIFF) imagery file
3. **API Key**: Your Geobase API key for authentication

The tileserver URL is automatically generated from your project reference.

### Demo Configuration

The modal comes pre-filled with demo values from environment variables. Set these in your `.env.local` file:

```bash
# Demo Geobase Configuration (for prefilled values in modal)
VITE_GEOBASE_DEMO_PROJECT_REF=your_geobase_project_ref
VITE_GEOBASE_DEMO_COG_IMAGERY_URL=your_cog_imagery_url
VITE_GEOBASE_DEMO_API_KEY=your_geobase_api_key
```

**Note:** These environment variables are required for the demo configuration to work properly.

**Example COG Imagery URLs:**
- `https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/66bfa10598a7740001cf3d6a/0/66bfa10598a7740001cf3d6b.tif`
- `https://your-bucket.s3.amazonaws.com/path/to/your-image.tif`
- `https://your-domain.com/path/to/your-cog.tif`

The configuration is stored in memory and will be requested again if you switch providers and back to Geobase.

## 📋 Prerequisites

- Node.js 18+ and pnpm
- **Backend Choice**: Either Supabase account OR Geobase account
- Modern browser with WebGPU support

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
cd examples/04-geoai-supabase-geobase-integration
pnpm install
```

### 2. Backend Setup

#### Option A: Standard Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable PostGIS extension in your database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
   ```
3. Run the database schema setup (see `supabase/schema.sql`)
4. Get your project URL and anon key from Settings > API

#### Option B: Geobase Setup (Recommended for Vector Tiles)
1. Create a new Geobase project at [geobase.app](https://geobase.app)
2. PostGIS is enabled by default
3. Run the database schema setup via SQL Editor
4. Get your project URL and anon key from project settings

### 2.1 Run Migrations (Two Ways)

Use one of the following methods to initialize the database objects.

#### Way A: Run migration files directly in SQL Editor

Run these files in order:

1. `supabase/migrations/20250914214029_create_geoai_tables.sql`
2. `supabase/migrations/20250119000000_fix_geometry_multipolygon.sql`
3. `supabase/migrations/20250119000002_add_search_path_to_functions.sql`

#### Way B: Use Supabase CLI with a direct DB URL

```bash
cd examples/04-geoai-supabase-geobase-integration
supabase db push --db-url "<YOUR_DB_URL>" --dry-run
supabase db push --db-url "<YOUR_DB_URL>" --include-all
```

`db push` applies migrations and does not reset the full database. Use `--dry-run` first to preview changes.

#### Way C: Use `psql` with migration files directly

```bash
psql "$DATABASE_URL" -f "examples/04-geoai-supabase-geobase-integration/supabase/migrations/20250914214029_create_geoai_tables.sql"
psql "$DATABASE_URL" -f "examples/04-geoai-supabase-geobase-integration/supabase/migrations/20250119000000_fix_geometry_multipolygon.sql"
psql "$DATABASE_URL" -f "examples/04-geoai-supabase-geobase-integration/supabase/migrations/20250119000002_add_search_path_to_functions.sql"
```

Run in the same order shown above.

### 3. Environment Configuration

Create `.env.local` based on your backend choice:

#### For Standard Supabase:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### For Geobase (with Vector Tileserver):
```env
VITE_SUPABASE_URL=https://your-project.geobase.app
VITE_SUPABASE_ANON_KEY=your_geobase_anon_key
```

**🔍 How Backend Detection Works:**
The application automatically detects which backend you're using based on your `VITE_SUPABASE_URL`:
- URLs containing `.supabase.co` → Standard Supabase (GeoJSON layers)
- URLs containing `.geobase.app` → Geobase (Vector tileserver)

### 4. Start Development Server

```bash
pnpm dev
```

## 🗄️ Database Schema

The application uses the following Supabase tables:

`aidx` is the shared-instance prefix and stands for **AI Detection Index**.

### `aidx_sessions`
- Stores detection session metadata
- Links to user and detection parameters

### `aidx_results`
- Stores individual detection results
- PostGIS geometry for spatial queries
- Links to sessions and includes confidence scores

### `aidx_analytics`
- Performance metrics and statistics
- Processing times and accuracy data

## 🎯 Usage Examples

### Basic Detection with Storage

```typescript
import { useGeoAI } from './hooks/useGeoAI';
import { useSupabase } from './hooks/useSupabase';

function DetectionApp() {
  const { detectObjects } = useGeoAI();
  const { saveDetection } = useSupabase();

  const handleDetection = async (polygon: GeoJSON.Feature) => {
    // Run AI detection
    const results = await detectObjects({
      polygon,
      tasks: ['oil-storage-tank-detection', 'solar-panel-detection'],
      mapSourceParams: { zoomLevel: 18 }
    });

    // Save to Supabase
    await saveDetection({
      sessionId: generateSessionId(),
      results,
      metadata: {
        area: calculateArea(polygon),
        timestamp: new Date().toISOString()
      }
    });
  };

  return (
    <div>
      {/* Your map and UI components */}
    </div>
  );
}
```

### Query Historical Data

```typescript
import { useSupabase } from './hooks/useSupabase';

function AnalyticsDashboard() {
  const { getDetectionHistory, getSpatialQuery } = useSupabase();

  const loadHistoricalData = async () => {
    // Get all detections in a specific area
    const results = await getSpatialQuery({
      bounds: [-74.0, 40.7, -73.9, 40.8], // NYC area
      task: 'oil-storage-tank-detection',
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    });

    return results;
  };

  return (
    <div>
      {/* Analytics dashboard */}
    </div>
  );
}
```

## 🔧 Configuration Options

### Map Providers

The application supports multiple map providers:

```typescript
// ESRI (free, no API key required)
const esriConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery"
};

// Geobase (custom imagery)
const geobaseConfig = {
  provider: "geobase",
  projectRef: process.env.VITE_GEOBASE_PROJECT_REF,
  apikey: process.env.VITE_GEOBASE_API_KEY,
  cogImagery: process.env.VITE_GEOBASE_IMAGERY_URL
};
```

### AI Tasks Configuration

```typescript
const availableTasks = [
  'oil-storage-tank-detection',
  'solar-panel-detection',
  'building-detection',
  'car-detection',
  'ship-detection',
  'land-cover-classification',
  'building-footprint-segmentation',
  'wetland-segmentation',
  'zero-shot-object-detection',
  'image-feature-extraction'
];
```

## 📊 Performance Considerations

### Model Loading
- Models are cached after first load
- Use Web Workers for better performance
- Consider model size (50-200MB per model)

### Database Optimization
- Spatial indexes on geometry columns
- Partitioning by date for large datasets
- Connection pooling for high concurrency

### Memory Management
- Clear detection results when not needed
- Use appropriate zoom levels
- Break large polygons into smaller chunks

## 🚀 Production Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic builds

### Supabase Production Setup

1. Enable Row Level Security (RLS)
2. Set up proper authentication policies
3. Configure backup and monitoring
4. Set up database functions for complex queries

## 📈 Analytics and Monitoring

The application includes built-in analytics:

- Detection accuracy metrics
- Processing time statistics
- User engagement tracking
- Error rate monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- GitHub Issues: [Report bugs and request features](https://github.com/decision-labs/geoai.js/issues)
- Discord: [Join our community](https://geobase.app/discord)
- Documentation: [docs.geobase.app/geoai](https://docs.geobase.app/geoai)

## 🔗 Related Resources

- [GeoAI.js Documentation](https://docs.geobase.app/geoai)
- [Supabase Documentation](https://supabase.com/docs)
- [Geobase Documentation](https://docs.geobase.app)
- [PostGIS Documentation](https://postgis.net/documentation/)
