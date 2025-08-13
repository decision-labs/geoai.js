# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build Commands

- `pnpm build` - Full build: builds core, React package, and type declarations
- `pnpm build:core` - Build core package only (TypeScript + Vite)
- `pnpm build:react` - Build React hooks package only
- `pnpm build:types` - Generate TypeScript declarations for both packages
- `pnpm build:examples` - Build and copy to examples directory
- `pnpm dev` - Start development server with Vite

### Testing Commands

- `pnpm test` - Run all tests with Vitest
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:build` - Build first, then run build-specific tests
- `vitest run test/build.test.ts` - Run specific test file

### Linting and Formatting

- `pnpm lint:scripts` - Lint TypeScript files with ESLint
- `pnpm format:scripts` - Format code with Prettier
- `pnpm format` - Format both scripts and styles

### Single Test Execution

Use `pnpm run test <test-file-path>` to run individual tests, e.g.:

- `pnpm run test objectDetection.test.ts`
- `pnpm run test buildingFootprint.test.ts`

Or use the test name to run the specific test in the file. e.g:

- `pnpm run test "geoai.objectDetection"`

## Architecture Overview

This is a TypeScript library for running geospatial AI models in frontend applications. The core architecture follows a pipeline pattern with pluggable models.

### Core Components

**Main Entry Point** (`src/index.ts`):

- Exports `geoai` main API and utilities
- Single point of access for the library

**Pipeline System** (`src/geobase-ai.ts`):

- `Pipeline` class manages AI model execution chains
- `geoai` object provides the main API: `pipeline()`, `tasks()`, `models()`, `validateChain()`
- Supports both single tasks and chainable task sequences
- Task dependency validation and automatic ordering

**Model Registry** (`src/registry.ts`):

- Central registry of all supported AI models and tasks
- Defines model configurations, chainable tasks, and factory functions
- Includes both HuggingFace and custom GeoAI models


### Model System

Models are organized in `src/models/` with a consistent interface pattern:

- Each model implements a factory pattern with `getInstance()`
- Models handle specific AI tasks (object detection, segmentation, classification)
- Support for both ONNX and HuggingFace Transformers.js models

### Data Providers

Map imagery providers in `src/data_providers/`:

- Mapbox, Geobase, and other geospatial data sources
- Consistent interface for fetching satellite imagery

### Type System

Core types in `src/core/types.ts`:

- `ProviderParams` - Configuration for map data providers
- `InferenceParams` - Input parameters for AI inference
- `ObjectDetectionResults` & `SegmentationResults` - Output types
- `ModelConfig` - Model registry configuration

## Key Patterns

### Pipeline Usage

```typescript
const pipeline = await geoai.pipeline(
  [
    {
      task: "object-detection",
      modelId: "geobase/WALDO30_yolov8m_640x640",
    },
  ],
  {
    provider: "mapbox",
    apiKey: "your-key",
  }
);

const result = await pipeline.inference({
  inputs: { polygon: geoJsonPolygon },
});
```

### Task Chaining

Tasks can be chained when compatible (defined in `chainableTasks`):

```typescript
const chain = await geoai.pipeline(
  [{ task: "zero-shot-object-detection" }, { task: "mask-generation" }],
  providerParams
);
```

## Build Configuration

- **Vite** for bundling with Terser minification
- **TypeScript** compilation with path aliases (`@` -> `src/`)
- **External dependencies**: HuggingFace Transformers.js, ONNX Runtime Web
- **Type generation** using dts-bundle-generator

## Testing Strategy

- Tests are in `test/` directory mirroring source structure
- Use Vitest for testing with 1,000,000ms timeout for AI model tests
- Coverage reporting with `@vitest/coverage-v8`
- Build validation tests in `test/build.test.ts`

## Package Structure

### Core Package (`@geobase-js/geoai`)

- **Import**: `import { geoai } from "@geobase-js/geoai"`
- **Files**: `build/dist/@geobase-js/geoai.js`, `build/dist/index.d.ts`
- **Dependencies**: HuggingFace Transformers.js, ONNX Runtime Web
- **Usage**: Vanilla JS, Node.js, any framework

## Package Management

Uses **pnpm** as the package manager. The repository includes a Next.js example application in `examples/next-geobase/` demonstrating library usage.
