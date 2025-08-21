export const GITHUB_REPO_URI = "https://github.com/decision-labs/geoai.js";
export const GITHUB_REPO_NAME = "decision-labs/geoai.js";
export const NPM_PACKAGE_NAME = "geoai";
export const NPM_PACKAGE_URI = "https://www.npmjs.com/package/geoai";

// Package-related constants for different contexts
export const PACKAGE_INFO = {
  name: NPM_PACKAGE_NAME,
  npmUri: NPM_PACKAGE_URI,
  githubUri: GITHUB_REPO_URI,
  githubName: GITHUB_REPO_NAME,
  // Common import patterns
  imports: {
    basic: `import { geoai } from "${NPM_PACKAGE_NAME}";`,
    withTypes: `import { geoai, ProviderParams } from "${NPM_PACKAGE_NAME}";`,
    all: `import * as GeoAI from "${NPM_PACKAGE_NAME}";`,
  },
  // Installation commands
  install: {
    npm: `npm install ${NPM_PACKAGE_NAME}`,
    yarn: `yarn add ${NPM_PACKAGE_NAME}`,
    pnpm: `pnpm add ${NPM_PACKAGE_NAME}`,
    withDeps: `npm install maplibre-gl ${NPM_PACKAGE_NAME} maplibre-gl-draw`,
  },
  // Package.json entries
  packageJson: {
    dependency: `"${NPM_PACKAGE_NAME}": "^0.0.7"`,
    workspace: `"${NPM_PACKAGE_NAME}": "workspace:*"`,
    devDependency: `"${NPM_PACKAGE_NAME}": "^0.0.7"`,
  },
} as const;

export const PROJECT_CONFIG = {
  name: NPM_PACKAGE_NAME,
  version: "0.0.7",
  repository: GITHUB_REPO_URI,
  homepage: "https://docs.geobase.app/geoai",
  npmPackage: NPM_PACKAGE_NAME,
  npmUri: NPM_PACKAGE_URI,
  author: "Decision Labs",
  license: "MIT",
  bugs: `${GITHUB_REPO_URI}/issues`,
  description:
    "A JavaScript library for running Geo AI models in frontend applications",
};

export const DOCS_CONFIG = {
  title: `${NPM_PACKAGE_NAME} Docs`,
  description: "Find documentation, guides, examples, and blueprints for GeoAi",
  chatLink: "https://geobase.app/discord",
  docsRepositoryBase: "https://github.com/decision-labs/geoai.js",
  favicon: "https://geobase.app/favicon.ico",
  logo: {
    javascript: "/geoai/javascript-logo.svg",
    alt: "JavaScript logo",
  },
};

export const BRAND_CONFIG = {
  name: "geoai.js",
  team: "Geobase team",
  teamUrl: "https://geobase.app",
  color: {
    hue: {
      dark: 152,
      light: 152,
    },
  },
};
