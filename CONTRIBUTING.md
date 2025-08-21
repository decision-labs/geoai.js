# Contributing to GeoAI.js

Thank you for your interest in contributing to GeoAI.js! We welcome contributions from the community to help improve our geospatial AI library.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md) (to be added). Please treat all contributors and users with respect and kindness.

## How to Contribute

There are many ways you can contribute to GeoAI.js:

- Report bugs and issues
- Suggest new features
- Improve documentation
- Write code to fix issues or add new features
- Review pull requests

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/geoai.js.git
   ```
3. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```
4. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Project

- Start the development server: `pnpm dev`
- Build the library: `pnpm build`
- Run tests: `pnpm test`
- Run tests with coverage: `pnpm test:coverage`

### Code Quality

We maintain high code quality standards:

- All code must pass TypeScript type checking
- Follow the existing code style (Prettier and ESLint configurations are provided)
- Pre-commit hooks will automatically format and lint your code
- Write unit tests for new functionality (we use Vitest)

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Pull Request Process

1. Ensure your code follows our style guidelines
2. Add tests for any new functionality
3. Update documentation as needed
4. Make sure all tests pass: `pnpm test`
5. Submit your pull request with a clear description of the changes
6. Link any related issues in your pull request description

### Adding New AI Models

If you're contributing a new AI model:

1. Create the model implementation in `src/models/`
2. Add it to the registry in `src/registry.ts`
3. Define TypeScript types in `src/core/types.ts`
4. Add comprehensive tests
5. Update the documentation
6. Ensure it follows the same interface pattern as existing models

### Adding Map Providers

To add a new map provider:

1. Implement the provider interface in `src/data_providers/`
2. Handle authentication and rate limiting appropriately
3. Test with various coordinate systems
4. Add integration tests
5. Update documentation

## Reporting Issues

When reporting issues, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Environment details (Node.js version, OS, etc.)
6. Any relevant code snippets or error messages

## Documentation

Improvements to documentation are always welcome. Our documentation is written in Markdown and can be found in the docs repository at `docs.geobase.app/geoai`.

## License

By contributing to GeoAI.js, you agree that your contributions will be licensed under the MIT License.