# Changelog

All notable changes to the geoai project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2024-01-XX

### Release Candidate
This is the first release candidate for version 1.0.0. This RC includes all the features and improvements planned for the final 1.0.0 release.

## [1.0.0-rc.2] - 2025-01-XX

### Release Candidate
- Bug fixes and improvements
- Minor documentation updates and example references to the new RC version.
- Internal release scripts updated to support rc.2 flow.
- No functional changes to the library API.

## [1.0.0] - 2024-01-XX

### Changed
- **BREAKING**: Renamed package from `geoai-js` to `geoai`
- Updated all import statements and package references
- Updated build output structure from `geoai-js.js` to `geoai.js`
- Updated documentation and examples
- Updated repository URLs and homepage

### Migration Guide
To migrate from the old package:
1. Update your package.json: `"geoai-js": "^0.0.7"` → `"geoai": "^1.0.0"`
2. Update all import statements: `import { geoai } from "geoai"` → `import { geoai } from "geoai"`
3. Update any build configurations that reference the old package name
4. Update any documentation or scripts that reference the old package

## [0.0.7] - 2024-12-19

### Fixed

- Resolved CSS Module compilation issues in Next.js examples
- Fixed TypeScript type errors in color theme configuration
- Improved build process reliability

### Changed

- Updated package version for npm release

## [0.0.2] - 2024-12-19

### Changed

- Updated package version for npm release

## [0.0.1] - 2024-12-19

### Added

- Initial public release of geoai
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

## [1.0.0-rc.3] - 2025-08-21

### Release Candidate
- Fix: remove hardcoded modelParams from the image-feature-extraction task

