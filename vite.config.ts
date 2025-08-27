/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import commonjs from "vite-plugin-commonjs";
import dotenv from "dotenv";
// @ts-ignore
import { visualizer } from "rollup-plugin-visualizer";

dotenv.config();

const getPackageName = () => {
  return packageJson.name;
};

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase());
  } catch (err) {
    throw new Error("Name property in package.json is missing.");
  }
};

const fileName = {
  es: `${getPackageName()}.js`,
  // iife: `${getPackageName()}.iife.js`,
  // cjs: `${getPackageName()}.common.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig(({ command }) => ({
  plugins:
    command === "build"
      ? [
          commonjs(),
          visualizer({
            filename: "stats.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : [],
  base: "./",
  build: {
    outDir: "./build",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: getPackageNameCamelCase(),
      formats,
      fileName: format => fileName[format],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      external: [
        "@huggingface/transformers",
        "onnxruntime-web"
      ],
      output: {
        globals: {
          "@huggingface/transformers": "transformers",
          "onnxruntime-web": "ort"
        },
      },
    },
  },
  test: {
    watch: false,
    testTimeout: 1000000,
    exclude: ["**/examples/**", "**/node_modules/**"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@@", replacement: path.resolve(__dirname) },
    ],
  },
}));
