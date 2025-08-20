# GeoAI.js Project Context for Qwen

## Project Overview

This project is **GeoAI.js**, a lightweight JavaScript library designed to run geospatial AI models directly within frontend applications. Its primary goal is to enable developers to integrate powerful AI capabilities like object detection, segmentation, and classification into web-based geographic information systems (GIS) or mapping applications without needing a backend server for inference.

### Key Technologies

- **Language:** TypeScript (compiled to JavaScript)
- **Build Tool:** Vite
- **Package Manager:** pnpm
- **Bundling:** ES Modules (ESM)
- **AI Frameworks:**
  - `@huggingface/transformers` (for ONNX model loading and inference)
  - `onnxruntime-web` (ONNX Runtime for Web)
- **Geospatial Utilities:**
  - `@turf/*` (for GeoJSON manipulation)
  - Custom utilities for map tile handling (`global-mercator`)
- **Testing:** Vitest
- **Linting & Formatting:** ESLint, Prettier, Stylelint
- **Type Definitions:** Generates bundled `.d.ts` files

### Core Architecture

1.  **`geoai` Entry Point (`src/geoai.ts`):** The main interface. Exposes the `geoai.pipeline` function to create model pipelines.
2.  **`Pipeline` Class:** Manages the creation and execution of single models or chains of models. It handles task validation, ordering (for chains), and input validation.
3.  **Model Registry (`src/registry.ts`):** A central list of all available AI models. Each entry defines the task name, description, required library, instantiation logic (`geobase_ai_pipeline`), and configuration for chaining and I/O.
4.  **Model Implementations (`src/models/`):** Individual classes for each supported model (e.g., `ObjectDetection`, `ZeroShotObjectDetection`, `MaskGeneration`). These classes handle the specific logic for loading the model, preprocessing inputs (fetching map imagery based on a GeoJSON polygon), running inference, and post-processing outputs (converting raw model outputs back into GeoJSON).
5.  **Provider Abstraction:** The library supports multiple map imagery providers (ESRI, Mapbox, Geobase, Sentinel). Provider parameters are passed during pipeline creation, allowing the models to fetch the necessary satellite/aerial imagery for analysis.
6.  **React Integration:** A separate export (`geoai/react`) provides React hooks for easier integration into React applications.

## Building and Running

### Prerequisites

- Node.js (version compatible with the project, likely modern LTS)
- pnpm (package manager specified in `package.json`)

### Setup

1.  Install dependencies:
    ```bash
    pnpm install
    ```

### Development

- **Start Dev Server:** Runs a local development server, likely for examples or demos.
  ```bash
  pnpm run dev
  ```

### Building

- **Build Library:** Compiles TypeScript, bundles the library using Vite, and generates type definitions. The output is placed in the `build/` directory.
  ```bash
  pnpm run build
  ```

### Testing

- **Run Tests:** Executes unit and integration tests using Vitest.
  ```bash
  pnpm run test
  ```
- **Run Tests with Coverage:** Runs tests and generates a coverage report.
  ```bash
  pnpm run test:coverage
  ```

### Code Quality

- **Lint Scripts:** Check code for stylistic or potential errors.
  ```bash
  pnpm run lint:scripts # Lint TypeScript files
  pnpm run lint:styles  # Lint CSS/SCSS files
  ```
- **Format Scripts:** Automatically format code according to project rules.
  ```bash
  pnpm run format:scripts # Format TypeScript files
  pnpm run format:styles  # Format CSS/SCSS files
  pnpm run format         # Format all files
  ```

## Development Conventions

- **Language:** TypeScript is used throughout for type safety.
- **Module System:** ES Modules (ESM) are used.
- **Aliases:** The project uses path aliases (`@/*` for `src/*`) for cleaner imports.
- **Linting & Formatting:** ESLint, Prettier, and Stylelint are configured to enforce code style. These are likely run as pre-commit hooks (via Husky/Lint-staged).
- **Testing:** Vitest is used for testing. Tests are likely colocated with the source files or in a `test/` directory.
- **Documentation:** Inline JSDoc/TSDoc comments are used in the source code. External documentation is hosted at `docs.geobase.app/geoai`.
- **Exports:** The library defines multiple entry points via the `exports` field in `package.json`, primarily exposing the main module and type definitions.