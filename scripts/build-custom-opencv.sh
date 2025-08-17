#!/bin/bash

# Custom OpenCV.js Build Script
# This script builds a minimal OpenCV.js with only the functions needed for geobase-ai.js

set -e

echo "=== Custom OpenCV.js Build Script ==="
echo "This will build a minimal OpenCV.js with only the functions you need"
echo ""

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found!"
    echo "Please install Emscripten first:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

echo "✅ Emscripten found: $(emcc --version | head -1)"

# Check if OpenCV repository exists
if [ ! -d "temp-opencv" ]; then
    echo "📥 Cloning OpenCV repository..."
    git clone https://github.com/opencv/opencv.git temp-opencv
else
    echo "✅ OpenCV repository already exists"
fi

# Check if build script exists
if [ ! -f "scripts/build_js.py" ]; then
    echo "📥 Downloading OpenCV.js build script..."
    curl -o scripts/build_js.py https://raw.githubusercontent.com/opencv/opencv/master/platforms/js/build_js.py
    chmod +x scripts/build_js.py
else
    echo "✅ Build script already exists"
fi

# Create build directory
BUILD_DIR="build_opencv_js"
echo "📁 Creating build directory: $BUILD_DIR"

# Build custom OpenCV.js
echo "🔨 Building custom OpenCV.js..."
echo "This may take 10-30 minutes depending on your system..."

python3 scripts/build_js.py $BUILD_DIR \
  --opencv_dir temp-opencv \
  --config scripts/opencv-js-whitelist.txt \
  --build_wasm \
  --disable_single_file \
  --cmake_option="-DBUILD_opencv_calib3d=OFF" \
  --cmake_option="-DBUILD_opencv_dnn=OFF" \
  --cmake_option="-DBUILD_opencv_features2d=OFF" \
  --cmake_option="-DBUILD_opencv_flann=OFF" \
  --cmake_option="-DBUILD_opencv_ml=OFF" \
  --cmake_option="-DBUILD_opencv_photo=OFF" \
  --cmake_option="-DBUILD_opencv_shape=OFF" \
  --cmake_option="-DBUILD_opencv_videoio=OFF" \
  --cmake_option="-DBUILD_opencv_videostab=OFF" \
  --cmake_option="-DBUILD_opencv_highgui=OFF" \
  --cmake_option="-DBUILD_opencv_superres=OFF" \
  --cmake_option="-DBUILD_opencv_stitching=OFF" \
  --cmake_option="-DBUILD_opencv_java=OFF" \
  --cmake_option="-DBUILD_opencv_python2=OFF" \
  --cmake_option="-DBUILD_opencv_python3=OFF" \
  --cmake_option="-DBUILD_EXAMPLES=OFF" \
  --cmake_option="-DBUILD_TESTS=OFF" \
  --cmake_option="-DBUILD_PERF_TESTS=OFF"

# Check if build was successful
if [ -f "$BUILD_DIR/bin/opencv.js" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📁 Custom OpenCV.js location: $BUILD_DIR/bin/opencv.js"
    
    # Show file size
    ORIGINAL_SIZE=$(ls -lh node_modules/.pnpm/@techstark+opencv-js@4.10.0-release.1/node_modules/@techstark/opencv-js/dist/opencv.js | awk '{print $5}')
    CUSTOM_SIZE=$(ls -lh $BUILD_DIR/bin/opencv.js | awk '{print $5}')
    
    echo "📊 Size comparison:"
    echo "  Original: $ORIGINAL_SIZE"
    echo "  Custom:   $CUSTOM_SIZE"
    
    echo ""
    echo "🎉 You can now replace the original OpenCV.js with your custom build!"
    echo "   Copy $BUILD_DIR/bin/opencv.js to your project and update imports."
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi
