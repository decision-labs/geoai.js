[![Main](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml/badge.svg)](https://github.com/decision-labs/geobase-ai.js/actions/workflows/main.yml)

# Geobase AI JavaScript Library

Provide user with a seamless experience of using Geo AI models in their frontend applications.

## Features

Inputs:

- Task: ... more geo-specific tasks than what HF provides (e.g. damage assessment, vegetation classification, etc.)
- Polygon
- Imagery Source/Provider

Outputs:

- Mask
- Points
- Classifications

## Future Ideas

### Model Selection Assistant

We can use [MobileBERT](https://huggingface.co/Xenova/mobilebert-uncased-mnli) to help developers select the appropriate model based on their description.

Example implementation:

```javascript
const classifier = await pipeline(
  "zero-shot-classification",
  "Xenova/mobilebert-uncased-mnli"
);

const text = `Hi Everyone, I've been trying to find a method to extract points from a WMS server the background is transparent and the only thing on server is the points in raster the WFS server is returning nothing but errors if there are tools or pre existing scripts where i can achieve this please let me know it would be greatly appreciated.`;

const labels = ["zero-shot-object-detection", "zero-shot-image-classification"];

const output = await classifier(text, labels);
/* Output:
{
    sequence: '...',
    labels: ['zero-shot-object-detection', 'zero-shot-image-classification'],
    scores: [0.5562091040482018, 0.1843621307860853]
}
*/
```

Source: [Discord Discussion](https://discord.com/channels/769917190182404127/1326839223331852319/1326839223331852319)

# vite-vanilla-ts-lib-starter

The starter is built on top of Vite 5.x and prepared for writing libraries in TypeScript. It generates a package with support for ESM modules and IIFE.

## Features

- ESM modules
- IIFE bundle for direct browser support without bundler
- Typings bundle
- ESLint - scripts linter
- Stylelint - styles linter
- Prettier - formatter
- Vitest - test framework
- Husky + lint-staged - pre-commit git hook set up for formatting

## GitHub Template

This is a template repo. Click the green [Use this template](https://github.com/kbysiec/vite-vanilla-ts-lib-starter/generate) button to get started.

## Clone to local

If you prefer to do it manually with the cleaner git history

```bash
git clone https://github.com/kbysiec/vite-vanilla-ts-lib-starter.git
cd vite-vanilla-ts-lib-starter
npm i
```

## Checklist

When you use this template, update the following:

- Remove `.git` directory and run `git init` to clean up the history
- Change the name in `package.json` - it will be the name of the IIFE bundle global variable and bundle files name (`.cjs`, `.mjs`, `.iife.js`, `d.ts`)
- Change the author name in `LICENSE`
- Clean up the `README` and `CHANGELOG` files

And, enjoy :)

## Usage

The starter contains the following scripts:

- `dev` - starts dev server
- `build` - generates the following bundles: ESM (`.js`) and IIFE (`.iife.js`). The name of bundle is automatically taken from `package.json` name property
- `test` - starts vitest and runs all tests
- `test:coverage` - starts vitest and run all tests with code coverage report
- `lint:scripts` - lint `.ts` files with eslint
- `lint:styles` - lint `.css` and `.scss` files with stylelint
- `format:scripts` - format `.ts`, `.html` and `.json` files with prettier
- `format:styles` - format `.cs` and `.scss` files with stylelint
- `format` - format all with prettier and stylelint
- `prepare` - script for setting up husky pre-commit hook
- `uninstall-husky` - script for removing husky from repository

## Testing

```bash
# run all tests:
pnpm run test
# run a specific test:
pnpm run test genericSegmentation
# run a specific section of a test:
pnpm run test -t "thresholds parameters"
```

## Acknowledgment

If you found it useful somehow, I would be grateful if you could leave a star in the project's GitHub repository.

Thank you.
