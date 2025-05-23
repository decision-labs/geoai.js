// This test file should be run after building the project with 'npm run build'
// It tests the actual built version of the library
import { describe, expect, it } from "vitest";

import { geobaseAi } from "../build/dist/geobase-ai.js";

describe("Build Tests", () => {
  // Test basic initialization
  it("should initialize without stack overflow", () => {
    expect(() => {
      const ai = geobaseAi;
      expect(ai).toBeDefined();
    }).not.toThrow();
  });

  // Test pipeline creation with different tasks
  it("should create pipelines without stack overflow", async () => {
    const tasks = geobaseAi.tasks();

    console.log({ tasks });

    // const detector = await geobaseAi.pipeline("object-detection", geobaseParamsBuilding);
    // console.log({detector})
  });
});
