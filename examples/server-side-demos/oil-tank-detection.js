const fs = require('fs');

// Your provided polygon
const detectionPolygon = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "coordinates": [
          [
            [
              54.685515505681195,
              24.759033512205562
            ],
            [
              54.6905472240411,
              24.7546477478501
            ],
            [
              54.69519499601981,
              24.759180313355216
            ],
            [
              54.690506808633074,
              24.763253976065087
            ],
            [
              54.685515505681195,
              24.759033512205562
            ]
          ]
        ],
        "type": "Polygon"
      }
    }
  ]
};

// Configuration for ESRI satellite imagery
const mapProviderConfig = {
  provider: "esri",
  serviceUrl: "https://server.arcgisonline.com/ArcGIS/rest/services",
  serviceName: "World_Imagery",
  tileSize: 256,
  attribution: "ESRI World Imagery",
};

async function runOilTankDetection() {
  console.log('🚀 Real Oil Tank Detection with geoai.js');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Import geoai dynamically
    console.log('📦 Loading geoai.js...');
    const geoai = await import('geoai');
    console.log('✅ geoai.js loaded successfully!');
    
    // Step 2: Initialize the pipeline
    console.log('🔧 Initializing AI Model...');
    const pipeline = await geoai.pipeline(
      [{ task: "oil-storage-tank-detection" }],
      mapProviderConfig
    );
    console.log('✅ AI Model Ready!');
    
    // Step 3: Run inference on the polygon
    console.log('\n🔍 Running oil tank detection...');
    console.log(`📍 Polygon vertices: ${detectionPolygon.features[0].geometry.coordinates[0].length - 1}`);
    
    const result = await pipeline.inference({
      inputs: { polygon: detectionPolygon.features[0] },
      mapSourceParams: { zoomLevel: 15 },
    });
    
    // Step 4: Process and display results
    const detectionCount = result.detections.features?.length || 0;
    console.log(`✅ Found ${detectionCount} oil storage tank${detectionCount !== 1 ? 's' : ''}!`);
    
    // Step 5: Save results to file
    const outputFile = 'oil-tank-detection-results.geojson';
    fs.writeFileSync(outputFile, JSON.stringify(result.detections, null, 2));
    console.log(`💾 Results saved to: ${outputFile}`);
    
    // Step 6: Display detection details
    if (detectionCount > 0) {
      console.log('\n📊 Detection Details:');
      result.detections.features.forEach((detection, index) => {
        const props = detection.properties;
        const confidence = props.confidence ? (props.confidence * 100).toFixed(1) : 'N/A';
        const className = props.class || 'unknown';
        console.log(`   ${index + 1}. Confidence: ${confidence}%, Class: ${className}`);
        
        if (props.bbox) {
          console.log(`      BBox: [${props.bbox.join(', ')}]`);
        }
      });
    }
    
    // Step 7: Generate summary
    console.log('\n📋 Summary:');
    console.log(`   • Total detections: ${detectionCount}`);
    console.log(`   • Output file: ${outputFile}`);
    console.log(`   • Polygon area processed`);
    
    console.log('\n🎯 Detection Complete!');
    
  } catch (error) {
    console.error('❌ Error during detection:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the detection
runOilTankDetection();
