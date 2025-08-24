const cv = require("@techstark/opencv-js");

function getOpenCVVersion() {
  try {
    if (cv.getBuildInformation) {
      const buildInfo = cv.getBuildInformation();
      console.log("Full build info:", buildInfo);
      const versionMatch = buildInfo.match(/OpenCV\s+(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : null;
    }
  } catch (e) {
    console.log("Error getting build info:", e.message);
  }
  return null;
}

function testOpenCVVersion() {
  console.log("🧪 Testing OpenCV version detection...");
  console.log("cv object:", typeof cv);
  console.log("cv.getBuildInformation:", typeof cv.getBuildInformation);
  console.log("cv.onRuntimeInitialized:", typeof cv.onRuntimeInitialized);
  
  // Test before initialization
  console.log("\n📋 Before initialization:");
  const versionBefore = getOpenCVVersion();
  console.log("Version before:", versionBefore);
  
  // Initialize OpenCV
  console.log("\n🔄 Initializing OpenCV...");
  cv.onRuntimeInitialized = () => {
    console.log("\n✅ OpenCV initialized!");
    
    // Test after initialization
    console.log("📋 After initialization:");
    const versionAfter = getOpenCVVersion();
    console.log("Version after:", versionAfter);
    
    console.log("\n🎯 Test completed!");
  };
}

testOpenCVVersion();
