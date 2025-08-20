# GEMINI.md

## Project Overview

This project, `geoai`, is a lightweight JavaScript library for running Geo AI models in frontend applications. It is written in TypeScript and uses Vite for bundling. It supports a variety of AI tasks, including object detection, segmentation, and classification, and can be used with multiple map providers like Geobase, Mapbox, ESRI, and Google Maps. The library is designed to be easy to use, with a simple API for creating and running AI pipelines. It also includes features like React integration, TypeScript support, and web worker support for running AI models in the background.

The core of the library is the `Pipeline` class, which is responsible for creating and managing AI model pipelines. The `geoai` object is the main entry point for the library, providing access to the `pipeline` method for creating pipelines, as well as methods for listing available tasks and models.

## Building and Running

The project uses `pnpm` as a package manager.

### Key commands:

*   **`pnpm install`**: Install dependencies.
*   **`pnpm dev`**: Starts the development server.
*   **`pnpm build`**: Builds the project for production. The output is placed in the `build` directory.
*   **`pnpm test`**: Runs the test suite using `vitest`.
*   **`pnpm lint:scripts`**: Lints the TypeScript files using ESLint.
*   **`pnpm format`**: Formats the code using Prettier.

## Development Conventions

*   **Code Style**: The project uses Prettier for code formatting and ESLint for linting. There are pre-commit hooks set up with Husky to ensure that all code is formatted and linted before being committed. All code must pass strict type checking. Prefer pure functions and immutable data. Use single quotes for strings and require semicolons. Indent with 2 spaces. Use descriptive variable names.
*   **Testing**: The project uses `vitest` for testing. Tests are located in the `test` directory and follow the naming convention `*.test.ts`. Unit tests for individual AI models, integration tests for provider connections, and build validation tests are required. Maintain >80% test coverage. Mock external dependencies.
*   **Architecture**: The project follows a modular architecture. Each AI model in `src/models/` follows the same interface pattern and is registered in `src/registry.ts`. All map providers implement the same interface in `src/data_providers/`. React hooks follow a consistent state management pattern.
*   **Branching**: The project uses the Gitflow workflow. All new development should be done on a feature branch, and then merged into the `develop` branch. The `main` branch is used for releases.
*   **Commits**: Commit messages should follow the Conventional Commits specification.
*   **Dependencies**: The project uses `pnpm` to manage dependencies. All dependencies should be added to the `package.json` file. Peer dependencies are required: `@huggingface/transformers`, `@techstark/opencv-js`, `onnxruntime-web`. Node.js 18+ is required for development.
*   **Pull Requests**: Pull requests must include test coverage for new features, be type-safe, and include documentation updates if needed. Consider the performance impact and maintain backward compatibility.

### Common Tasks

*   **Adding a New AI Model**: Create the model implementation in `src/models/`, add it to the registry in `src/registry.ts`, define TypeScript types in `src/core/types.ts`, add comprehensive tests, and update the documentation.
*   **Adding a Map Provider**: Implement the provider interface in `src/data_providers/`, handle authentication and rate limiting, test with various coordinate systems, and add integration tests.