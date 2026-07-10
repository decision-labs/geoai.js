# 🚀 Complete GeoAI.js + Supabase + Geobase Integration Guide

This example demonstrates a **production-ready** full-stack application that integrates GeoAI.js with Supabase and Geobase for storing and managing geospatial AI detection results in real-time.

## 🎯 What This Example Demonstrates

### Core Features
- **Multi-Task AI Detection**: Oil tanks, solar panels, buildings, cars, ships, and more
- **Real-time Storage**: Automatic saving to Supabase with PostGIS spatial database
- **Interactive Map Interface**: Draw polygons and see results instantly
- **Analytics Dashboard**: Comprehensive performance metrics and historical data
- **User Authentication**: Secure user sessions with Supabase Auth
- **Export Capabilities**: Download results as GeoJSON or CSV
- **Spatial Queries**: Advanced PostGIS queries for geospatial analysis

### Technical Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   GeoAI.js      │    │   Supabase      │
│                 │    │                 │    │                 │
│ • Interactive   │◄──►│ • AI Models     │◄──►│ • PostGIS DB    │
│   Map           │    │ • Detection     │    │ • Real-time     │
│ • Real-time UI  │    │ • Processing    │    │ • Auth          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Geobase       │
                    │                 │
                    │ • Custom Imagery│
                    │ • High-res Tiles│
                    │ • API Access    │
                    └─────────────────┘
```

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js 18+ and pnpm
- Supabase account and project
- Modern browser with WebGPU support

### 2. Setup
```bash
cd examples/04-geoai-supabase-geobase-integration
pnpm install
```

### 3. Environment Configuration
Copy `env.example` to `.env.local` and configure:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEOBASE_PROJECT_REF=your_geobase_project_ref
VITE_GEOBASE_API_KEY=your_geobase_api_key
```

### 4. Database Setup
Run the SQL schema in `supabase/schema.sql` in your Supabase SQL editor to create:
- PostGIS-enabled tables
- Spatial indexes
- RLS policies
- Database functions for spatial queries

### 5. Start Development
```bash
pnpm dev
```

## 📊 Key Components

### 1. Interactive Map (`InteractiveMap.tsx`)
- **MapLibre GL** integration with satellite imagery
- **Drawing tools** for polygon creation
- **Real-time detection** with multiple AI tasks
- **Visual results** with color-coded detection types
- **Settings panel** for confidence thresholds and zoom levels

### 2. Analytics Dashboard (`AnalyticsDashboard.tsx`)
- **Performance metrics** and processing times
- **Task breakdown** with detection counts
- **Historical data** visualization
- **Spatial queries** and heatmap generation
- **Session management** and export capabilities

### 3. Supabase Integration (`supabase.ts`)
- **PostGIS spatial database** for geospatial data
- **Real-time subscriptions** for live updates
- **Row Level Security** for data protection
- **Advanced spatial functions** for complex queries
- **User authentication** and session management

### 4. GeoAI Hook (`useGeoAI.ts`)
- **Multi-task detection** pipeline
- **Automatic session creation** and management
- **Performance tracking** and analytics
- **Error handling** and retry logic
- **Memory management** for large datasets

## 🗄️ Database Schema

`aidx` is the shared-instance prefix and stands for **AI Detection Index**.

### Core Tables
- **`aidx_sessions`**: Session metadata and user tracking
- **`aidx_results`**: Individual detection results with PostGIS geometry
- **`aidx_analytics`**: Performance metrics and processing statistics

### Spatial Functions
- **`aidx_get_detections_in_bounds()`**: Spatial queries within bounding boxes
- **`aidx_get_detection_heatmap()`**: Heatmap generation for visualization
- **`aidx_get_detection_stats()`**: Statistical analysis of detection results

### Security
- **Row Level Security (RLS)** enabled on all tables
- **User-based access control** for data privacy
- **Public statistics view** for aggregated data

## 🎨 User Interface

### Interactive Map
- **Provider Selection**: ESRI (free), Mapbox, Geobase, Google Maps
- **Task Configuration**: Enable/disable specific AI detection tasks
- **Real-time Results**: Instant visualization of detection results
- **Export Options**: Download results in multiple formats

### Analytics Dashboard
- **Key Metrics**: Total detections, sessions, processing times
- **Task Breakdown**: Visual representation of detection types
- **Performance Charts**: Processing time and accuracy metrics
- **Session History**: Browse and analyze past detection sessions

### Settings Panel
- **Provider Configuration**: API keys and service endpoints
- **Detection Parameters**: Confidence thresholds and zoom levels
- **Environment Setup**: Required environment variables
- **Feature Status**: Current capabilities and limitations

## 🚀 Production Features

### Performance Optimization
- **Model Caching**: AI models cached after first load
- **Spatial Indexing**: PostGIS spatial indexes for fast queries
- **Connection Pooling**: Efficient database connections
- **Memory Management**: Automatic cleanup of large datasets

### Security
- **Authentication**: Supabase Auth integration
- **Data Privacy**: User-based data isolation
- **API Security**: Secure API key management
- **Input Validation**: Sanitized user inputs

### Scalability
- **Horizontal Scaling**: Stateless application design
- **Database Optimization**: Efficient spatial queries
- **CDN Integration**: Static asset optimization
- **Real-time Updates**: WebSocket-based live updates

## 📈 Use Cases

### 1. Energy Infrastructure Monitoring
```typescript
// Monitor oil storage facilities
const monitorFacility = async (facilityPolygon) => {
  const result = await detectObjects({
    polygon: facilityPolygon,
    tasks: ['oil-storage-tank-detection'],
    mapSourceParams: { zoomLevel: 18 }
  });
  
  // Store results for historical tracking
  await saveDetectionResults(result, sessionId);
  
  return result.detections;
};
```

### 2. Environmental Impact Assessment
```typescript
// Assess solar panel coverage
const assessSolarCoverage = async (areaOfInterest) => {
  const result = await detectObjects({
    polygon: areaOfInterest,
    tasks: ['solar-panel-detection', 'building-detection'],
    mapSourceParams: { zoomLevel: 19 }
  });
  
  // Calculate coverage statistics
  const coverage = calculateCoverage(result.detections);
  
  return {
    totalPanels: result.detections.features.length,
    coverage: coverage,
    environmentalImpact: assessImpact(coverage)
  };
};
```

### 3. Urban Planning
```typescript
// Analyze building density
const analyzeBuildingDensity = async (cityArea) => {
  const result = await detectObjects({
    polygon: cityArea,
    tasks: ['building-footprint-segmentation'],
    mapSourceParams: { zoomLevel: 17 }
  });
  
  // Generate density heatmap
  const heatmap = await getDetectionHeatmap({
    bounds: getBounds(cityArea),
    task: 'building-footprint-segmentation'
  });
  
  return heatmap;
};
```

## 🔧 Customization

### Adding New Detection Tasks
1. Update `DETECTION_TASKS` array in `InteractiveMap.tsx`
2. Add task configuration in `useGeoAI.ts`
3. Update database schema if needed
4. Add visualization styles

### Custom Map Providers
1. Implement provider configuration in `getMapStyle()`
2. Add environment variables
3. Update provider selection UI
4. Test with different imagery sources

### Advanced Analytics
1. Extend database functions in `schema.sql`
2. Add new metrics to `AnalyticsDashboard.tsx`
3. Implement custom visualizations
4. Add export formats

## 📚 Learning Resources

### Documentation
- [GeoAI.js Documentation](https://docs.geobase.app/geoai)
- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [MapLibre GL Documentation](https://maplibre.org/maplibre-gl-js-docs/)

### Related Examples
- [01-quickstart](../01-quickstart/): Basic GeoAI.js usage
- [02-quickstart-with-workers](../02-quickstart-with-workers/): Web Worker integration
- [Live Examples](https://docs.geobase.app/geoai-live/): Interactive demos

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/decision-labs/geoai.js/issues)
- **Discord**: [Join our community](https://geobase.app/discord)
- **Documentation**: [docs.geobase.app/geoai](https://docs.geobase.app/geoai)

---

**Built with ❤️ by the GeoAI.js team**

This example showcases the power of combining GeoAI.js with modern backend services to create production-ready geospatial AI applications. The integration demonstrates best practices for real-time data processing, spatial database management, and user experience design.
