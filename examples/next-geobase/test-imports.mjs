#!/usr/bin/env node

// Test the local package imports
console.log('🧪 Testing Local Package Imports\n');

try {
  // Test core import
  console.log('1️⃣ Testing core import...');
  const { geoai } = await import('@geobase.js/geoai');
  
  console.log('✅ Core import successful');
  console.log(`✅ Available tasks: ${geoai.tasks().length}`);
  console.log(`✅ Available models: ${geoai.models().length}`);
  
  console.log('\n2️⃣ Testing React import...');
  const reactModule = await import('@geobase.js/geoai/react');
  
  console.log('✅ React import successful');
  console.log(`✅ useGeoAIWorker: ${typeof reactModule.useGeoAIWorker}`);
  console.log(`✅ useOptimizedGeoAI: ${typeof reactModule.useOptimizedGeoAI}`);
  
  console.log('\n🎉 All imports working correctly!');
  console.log('\nYou can now use:');
  console.log('import { geoai } from "@geobase.js/geoai"');
console.log('import { useGeoAIWorker } from "@geobase.js/geoai/react"');
  
} catch (error) {
  console.error('❌ Import test failed:', error.message);
  process.exit(1);
}