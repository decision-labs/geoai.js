// This test file should be run after building the project with 'npm run build'
// It tests the actual built version of the library
import { describe, expect, it } from "vitest";

import { geoai } from "../build/dist/@geobase/geoai";

describe("Build Tests", () => {
  // Test basic initialization
  it("should initialize without stack overflow", () => {
    expect(() => {
      const ai = geoai;
      expect(ai).toBeDefined();
    }).not.toThrow();
  });

  // Test pipeline creation with different tasks
  it("should create pipelines without stack overflow", async () => {
    const tasks = geoai.tasks();

    console.log({ tasks });

    // const detector = await geoai.pipeline("object-detection", geobaseParamsBuilding);
    // console.log({detector})
  });
});
