#!/bin/bash

# RC1 Build Verification Script
# This script verifies that the 1.0.0-rc.1 build is ready for release

echo "🔍 Verifying RC1 Build for geoai v1.0.0-rc.1"
echo "=============================================="

# Check current version
echo "📦 Checking package version..."
VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" = "1.0.0-rc.1" ]; then
    echo "✅ Package version is correct: $VERSION"
else
    echo "❌ Package version mismatch. Expected: 1.0.0-rc.1, Got: $VERSION"
    exit 1
fi

# Check if build directory exists
echo "📁 Checking build artifacts..."
if [ -d "build" ]; then
    echo "✅ Build directory exists"
else
    echo "❌ Build directory missing"
    exit 1
fi

# Check build files
echo "📄 Checking build files..."
if [ -f "build/geoai.js" ]; then
    echo "✅ Main bundle exists"
    SIZE=$(ls -lh build/geoai.js | awk '{print $5}')
    echo "   Size: $SIZE"
else
    echo "❌ Main bundle missing"
    exit 1
fi

if [ -f "build/index.d.ts" ]; then
    echo "✅ TypeScript definitions exist"
    LINES=$(wc -l < build/index.d.ts)
    echo "   Lines: $LINES"
else
    echo "❌ TypeScript definitions missing"
    exit 1
fi

if [ -f "build/package.json" ]; then
    echo "✅ Build package.json exists"
    BUILD_VERSION=$(node -p "require('./build/package.json').version")
    if [ "$BUILD_VERSION" = "1.0.0-rc.1" ]; then
        echo "✅ Build package.json version is correct: $BUILD_VERSION"
    else
        echo "❌ Build package.json version mismatch. Expected: 1.0.0-rc.1, Got: $BUILD_VERSION"
        exit 1
    fi
else
    echo "❌ Build package.json missing"
    exit 1
fi

# Check git tag
echo "🏷️  Checking git tag..."
if git tag -l | grep -q "v1.0.0-rc.1"; then
    echo "✅ Git tag v1.0.0-rc.1 exists"
else
    echo "❌ Git tag v1.0.0-rc.1 missing"
    exit 1
fi

# Check documentation
echo "📚 Checking documentation..."
if [ -f "RELEASE_NOTES_v1.0.0-rc.1.md" ]; then
    echo "✅ RC1 release notes exist"
else
    echo "❌ RC1 release notes missing"
    exit 1
fi

if [ -f "RC1_BUILD_SUMMARY.md" ]; then
    echo "✅ RC1 build summary exists"
else
    echo "❌ RC1 build summary missing"
    exit 1
fi

# Check changelog
echo "📝 Checking changelog..."
if grep -q "## \[1.0.0-rc.1\]" CHANGELOG.md; then
    echo "✅ Changelog includes RC1 entry"
else
    echo "❌ Changelog missing RC1 entry"
    exit 1
fi

# Run build tests
echo "🧪 Running build tests..."
if pnpm test:build > /dev/null 2>&1; then
    echo "✅ Build tests pass"
else
    echo "❌ Build tests failed"
    exit 1
fi

echo ""
echo "🎉 RC1 Build Verification Complete!"
echo "=================================="
echo "✅ All checks passed"
echo "✅ Build is ready for testing"
echo ""
echo "Next steps:"
echo "1. Test the build with: npm install geoai@1.0.0-rc.1"
echo "2. Publish to NPM when ready: cd build && npm publish --access public --tag rc"
echo "3. Create GitHub release with build artifacts"
echo ""
echo "Build artifacts location: ./build/"
echo "Documentation: RELEASE_NOTES_v1.0.0-rc.1.md"
echo "Summary: RC1_BUILD_SUMMARY.md"
