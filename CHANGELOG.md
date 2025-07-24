# Changelog

All notable changes to the @geobase-js/geoai project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-12-19

### Added

- Initial public release of @geobase-js/geoai
- Support for multiple Geo AI models:
  - Object Detection
  - Building Footprint Segmentation
  - Land Cover Classification
  - Zero-shot Object Detection
  - Oriented Object Detection
  - Oil Storage Tank Detection
  - Solar Panel Detection
  - Ship Detection
  - Car Detection
  - Wetland Segmentation
- TypeScript support with full type definitions
- ESM module support
- CDN distribution via unpkg and jsDelivr
- Comprehensive test suite
- Documentation and examples

### Features

- Core GeoAI class for model interaction
- GeoRawImage class for image data handling
- Support for various image formats and sources
- Configurable confidence thresholds and parameters
- Framework-agnostic design for use with any JavaScript framework

### Technical

- Built with Vite 5.x
- TypeScript compilation and type generation
- ESLint and Prettier for code quality
- Vitest for testing
- Husky for pre-commit hooks
