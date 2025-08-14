import { describe, expect, it } from "vitest";
import { geoai } from "../src/geobase-ai";
import { tmsParams } from "./constants";

describe("TMS Simple Integration", () => {
  describe("TMS Provider Integration", () => {
    it("should create pipeline with TMS provider", async () => {
      console.log("Testing TMS provider integration...");
      console.log("TMS Provider:", tmsParams.provider);

      try {
        // Create the pipeline with object detection
        const pipeline = await geoai.pipeline(
          [{ task: "object-detection" }],
          tmsParams
        );

        expect(pipeline).toBeDefined();
        expect(typeof pipeline.inference).toBe("function");

        console.log("✅ TMS pipeline created successfully!");
        console.log("📋 Pipeline type:", pipeline.constructor.name);

        // Test that we can access the data provider
        if (
          pipeline &&
          typeof pipeline === "object" &&
          "dataProvider" in pipeline
        ) {
          const dataProvider = (pipeline as any).dataProvider;
          expect(dataProvider).toBeDefined();
          console.log("✅ TMS data provider initialized successfully!");
          console.log("📋 Data provider type:", dataProvider.constructor.name);
        }
      } catch (error) {
        console.error("❌ Error creating TMS pipeline:", error);
        throw error;
      }
    }, 30000); // 30 second timeout

    it("should create pipeline with building detection", async () => {
      console.log("Testing TMS provider with building detection...");

      try {
        // Create the pipeline with building detection
        const pipeline = await geoai.pipeline(
          [{ task: "building-detection" }],
          tmsParams
        );

        expect(pipeline).toBeDefined();
        expect(typeof pipeline.inference).toBe("function");

        console.log("✅ TMS building detection pipeline created successfully!");
        console.log("📋 Pipeline type:", pipeline.constructor.name);
      } catch (error) {
        console.error(
          "❌ Error creating TMS building detection pipeline:",
          error
        );
        throw error;
      }
    }, 30000);
  });
});
