# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeoAI.js is a TypeScript library for running specialized geospatial AI models in frontend applications. It provides a pipeline system to chain AI tasks together, integrates with multiple map providers (ESRI, Geobase, Mapbox, Sentinel), and includes React hooks for seamless integration.

## Development Commands

**Primary workflow:**
- `pnpm dev` - Start development server
- `pnpm build` - Full build (core + types + package)  
- `pnpm test` - Run test suite with Vitest
- `pnpm test:coverage` - Run tests with coverage report

**Quality checks:**
- `pnpm lint:scripts` - Lint TypeScript files with ESLint
- `pnpm format:scripts` - Format code with Prettier
- `pnpm test:build` - Test the built package works correctly

**Individual build steps:**
- `pnpm build:core` - TypeScript compilation + Vite build
- `pnpm build:types` - Generate TypeScript definitions  
- `pnpm build:package` - Copy package.json to build directory

## Architecture

### Core Pipeline System
The main architecture revolves around a pipeline that can chain multiple AI tasks:
- **Pipeline validation**: Checks task dependencies and parameter compatibility
- **Model registry**: Centralized registry of all the AI models in `src/registry.ts`
- **Provider abstraction**: Multiple map data providers through `src/data_providers/`
- **Type safety**: Strong TypeScript typing throughout with core types in `src/core/types.ts`

### Key Files
- `src/geoai.ts` - Main pipeline implementation and public API
- `src/registry.ts` - Model registry with all the AI task definitions
- `src/models/` - Individual AI model implementations
- `src/data_providers/` - Map provider integrations (ESRI, Geobase, etc.)
- `src/types/` - Core data types like GeoRawImage, BoundingBox

### React Integration
React hooks are implemented with sophisticated lifecycle management:
- `useGeoAIWorker` - Advanced hook with full state management
- `useOptimizedGeoAI` - Helper hook with optimized parameters
- Web worker support for non-blocking AI inference

## Build Configuration

- **Vite 5.4.14** for fast building with Terser minification
- **TypeScript 5.7.3** in strict mode
- **Output**: Single `geoai.js` ES module (~10MB due to AI models)
- **Peer dependencies**: `@huggingface/transformers`, `onnxruntime-web`

## Testing

- **Framework**: Vitest for unit and integration tests
- **Coverage**: 22 test files covering all AI models and providers
- **Build validation**: `pnpm test:build` validates the final package

## AI Tasks Architecture

All the AI tasks fall into categories:
- **Detection**: Object detection, zero-shot detection, oriented detection
- **Segmentation**: Mask generation, building footprints, wetlands
- **Classification**: Land cover classification
- **Specialized**: Solar panels, ships, cars, oil tanks, feature extraction

Each task is registered with specific input/output types and model configurations.

## Development Notes

- Bundle size is large (~10MB) due to opencv-js but this dependency will later be removed by migrating to either custom compiled version of opencv-js or implementing our own functions for the tasks that require it - peer dependencies prevent duplication
- Memory management is critical in React hooks due to large data structures
- Web workers are used to prevent UI blocking during AI inference
- TypeScript-first development with comprehensive type definitions
