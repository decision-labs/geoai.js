# AGENTS.md

Instructions for AI coding agents working on the GeoAI.js project.

## Project Overview

GeoAI.js is a TypeScript library for running geospatial AI models in browsers. It provides a tool kit to run GeoAI tasks (object detection, segmentation, classification) with React integration and multiple map provider support.

## Setup Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Full build process
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint:scripts
pnpm format:scripts
```

## Code Style Guidelines

- **TypeScript strict mode** - All code must pass strict type checking
- **Functional programming patterns** - Prefer pure functions and immutable data
- **Single quotes** for strings
- **Semicolons required**
- **2-space indentation**
- **Descriptive variable names** - Especially for AI model parameters
- **JSDoc comments** for public APIs and complex functions

## Architecture Patterns

### AI Model Implementation
- Each model in `src/models/` follows the same interface pattern
- Models export a default function with typed inputs/outputs
- Use the registry pattern in `src/registry.ts` for model registration

### Provider Integration
- All map providers implement the same interface in `src/data_providers/`
- Handle different authentication methods (API keys, tokens, none)
- Support raster data sources only for now

### React Hook Pattern
- Use consistent state management (loading, error, result)
- Implement proper cleanup for large data structures
- Support web worker execution for performance

## Testing Instructions

- **Unit tests** for individual AI models using Vitest
- **Integration tests** for provider connections
- **Build validation** with `pnpm test:build`
- **Coverage requirements** - Maintain >80% coverage
- **Mock external dependencies** - Don't make real API calls in tests

## Development Environment

### Dependencies
- **Peer dependencies** are required: `@huggingface/transformers`, `@techstark/opencv-js`, `onnxruntime-web`
- **Node.js 18+** required for development
- **pnpm** as package manager (not npm or yarn)

### Build Process
- **Vite** for bundling with custom configuration
- **TypeScript** definitions generated separately
- **Single bundle output** for CDN usage
- **Large bundle size** (~10MB) is expected due to AI models

## Performance Considerations

- **Memory management** is critical - AI models use significant RAM
- **Web workers** should be used for inference to prevent UI blocking  
- **Lazy loading** of models when possible
- **Proper cleanup** of resources, especially in React hooks

## Security Guidelines

- **No API keys in code** - Use environment variables or user-provided keys
- **Validate all external inputs** - Especially image URLs and coordinates
- **Sanitize user-provided parameters** for AI models
- **Rate limiting** considerations for map provider APIs

## Pull Request Guidelines

- **Test coverage** for new features
- **Type safety** - No `any` types without justification
- **Documentation updates** - Update README and examples if needed
- **Performance impact** - Consider bundle size implications
- **Backward compatibility** - Maintain existing API contracts

## Common Tasks

### Adding a New AI Model
1. Create model implementation in `src/models/`
2. Add to registry in `src/registry.ts`
3. Define TypeScript types in `src/core/types.ts`
4. Add comprehensive tests
5. Update documentation

### Adding a Map Provider
1. Implement provider interface in `src/data_providers/`
2. Handle authentication and rate limiting
3. Test with various coordinate systems
4. Add integration tests

### React Hook Updates
1. Follow existing state management patterns
2. Implement proper TypeScript generics
3. Test with different AI model combinations
4. Ensure memory cleanup on unmount
