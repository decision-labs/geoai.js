import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { geobaseAi } from "../src/geobase-ai";
import {
  GenericSegmentation,
  SegmentationInput,
} from "../src/models/generic_segmentation";
import {
  geobaseParams,
  geobaseParamsBuilding,
  input_bbox,
  input_point,
  mapboxParams,
  polygon,
  polygonBuilding,
  quadrants,
  quadrants_points,
} from "./constants";
import { geoJsonToGist } from "./utils/saveToGist";

describe("geobaseAi.genericSegmentation", () => {
  let mapboxInstance: GenericSegmentation | undefined;
  let geobaseInstance: GenericSegmentation | undefined;
  let geobaseBuildingInstance: GenericSegmentation | undefined;

  beforeAll(async () => {
    try {
      // Initialize instances for reuse across tests
      const mapboxResult = await geobaseAi.pipeline(
        "mask-generation",
        mapboxParams
      );
      mapboxInstance = mapboxResult.instance as GenericSegmentation;

      const geobaseResult = await geobaseAi.pipeline(
        "mask-generation",
        geobaseParams
      );
      geobaseInstance = geobaseResult.instance as GenericSegmentation;

      const geobaseBuildingResult = await geobaseAi.pipeline(
        "mask-generation",
        geobaseParamsBuilding,
        "Xenova/slimsam-77-uniform",
        { revision: "boxes" }
      );
      geobaseBuildingInstance =
        geobaseBuildingResult.instance as GenericSegmentation;
    } catch (error) {
      console.error("Error initializing test instances:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup any resources if needed
    if (mapboxInstance) {
      mapboxInstance = undefined;
    }
    if (geobaseInstance) {
      geobaseInstance = undefined;
    }
    if (geobaseBuildingInstance) {
      geobaseBuildingInstance = undefined;
    }
  });

  it("should initialize a segmentation pipeline", async () => {
    const result = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result.instance).toBeInstanceOf(GenericSegmentation);
    expect(result.instance).toBeDefined();
    expect(result.instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    expect(result1.instance).toBe(result2.instance);
    expect(result1.instance.model).toBe(result2.instance.model);
  });

  it("should create a new instance for different configurations of the model", async () => {
    const result1 = await geobaseAi.pipeline("mask-generation", mapboxParams);
    const result2 = await geobaseAi.pipeline(
      "mask-generation",
      mapboxParams,
      "Xenova/slimsam-77-uniform",
      {
        revision: "boxes",
        cache_dir: "./cache",
      }
    );
    expect(result1.instance.model).not.toBe(result2.instance.model);
    expect(result1.instance).not.toBe(result2.instance);
  });

  it("should throw exception for invalid model parameters", async () => {
    const invalidOptions = [
      { revision: "invalid_revision" },
      { subfolder: "invalid_subfolder" },
      { model_file_name: "invalid_model_file_name" },
      { device: "invalid_device" },
      { dtype: "invalid_dtype" },
    ];

    for (const options of invalidOptions) {
      try {
        await geobaseAi.pipeline(
          "mask-generation",
          mapboxParams,
          "Xenova/slimsam-77-uniform",
          options
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(
          /Invalid dtype|Unsupported device|Could not locate file|Unauthorized access to file/
        );
      }
    }
  });

  it("should process a polygon for segmentation and generate valid GeoJSON", async () => {
    if (!mapboxInstance) {
      throw new Error("Mapbox instance not initialized");
    }
    for (const [quadrant, polygon] of Object.entries(quadrants)) {
      try {
        const input_points = quadrants_points[quadrant];
        const pointInput: SegmentationInput = {
          type: "points",
          coordinates: input_points,
        };
        const result = await mapboxInstance.inference({
          inputs: {
            polygon,
            input: pointInput,
          },
        });

        // Check basic properties
        expect(result).toHaveProperty("geoRawImage");
        expect(result).toHaveProperty("masks");
        expect(result.geoRawImage).toBeDefined();
        expect(result.geoRawImage).not.toBeNull();

        const { masks } = result;
        expect(masks).toHaveProperty("type", "FeatureCollection");
        expect(masks).toHaveProperty("features");
        expect(masks.features).toBeInstanceOf(Array);
        expect(masks.features.length).toBeGreaterThan(0);

        // Save output to gist
        await geoJsonToGist({
          content: masks,
          fileName: "genericSegmentationMapbox.geojson",
          description:
            "result genericSegmentation - should process a polygon for segmentation and generate valid GeoJSON",
        });
      } catch (error) {
        console.error(`Error processing quadrant ${quadrant}:`, error);
        throw error;
      }
    }
  });

  it("should process a polygon for segmentation and generate valid GeoJSON for source geobase with point", async () => {
    if (!geobaseInstance) {
      throw new Error("Geobase instance not initialized");
    }
    const pointInput: SegmentationInput = {
      type: "points",
      coordinates: input_point,
    };
    const result = await geobaseInstance.inference({
      inputs: {
        polygon,
        input: pointInput,
      },
    });

    // Check basic properties
    expect(result).toHaveProperty("geoRawImage");
    expect(result).toHaveProperty("masks");
    expect(result.geoRawImage).toBeDefined();
    expect(result.geoRawImage).not.toBeNull();

    const { masks } = result;
    expect(masks).toHaveProperty("type", "FeatureCollection");
    expect(masks).toHaveProperty("features");
    expect(masks.features).toBeInstanceOf(Array);
    expect(masks.features.length).toBeGreaterThan(0);

    // Save output to gist
    await geoJsonToGist({
      content: masks,
      fileName: "genericSegmentationGeobase.geojson",
      description:
        "result genericSegmentation - should process a polygon for segmentation and generate valid GeoJSON for source geobase with point",
    });
  });

  it("should process a polygon for segmentation and generate valid GeoJSON for source geobase with boxes", async () => {
    if (!geobaseBuildingInstance) {
      throw new Error("Geobase building instance not initialized");
    }
    const boxInput: SegmentationInput = {
      type: "boxes",
      coordinates: input_bbox,
    };
    const result = await geobaseBuildingInstance.inference({
      inputs: {
        polygon: polygonBuilding,
        input: boxInput,
      },
    });

    // Check basic properties
    expect(result).toHaveProperty("geoRawImage");
    expect(result).toHaveProperty("masks");
    expect(result.geoRawImage).toBeDefined();
    expect(result.geoRawImage).not.toBeNull();

    const { masks } = result;
    expect(masks).toHaveProperty("type", "FeatureCollection");
    expect(masks).toHaveProperty("features");
    expect(masks.features).toBeInstanceOf(Array);
    expect(masks.features.length).toBeGreaterThan(0);

    // Save output to gist
    await geoJsonToGist({
      content: masks,
      fileName: "genericSegmentationGeobaseBoxes.geojson",
      description:
        "result genericSegmentation - should process a polygon for segmentation and generate valid GeoJSON for source geobase with boxes",
    });
  });
});

describe("boxes pipeline with thresholds parameter", () => {
  let boxesInstance: GenericSegmentation | undefined;

  beforeAll(async () => {
    try {
      const { instance } = await geobaseAi.pipeline(
        "mask-generation",
        geobaseParamsBuilding,
        "Xenova/slimsam-77-uniform",
        { revision: "boxes" }
      );
      boxesInstance = instance as GenericSegmentation;
    } catch (error) {
      console.error("Error initializing boxes instance:", error);
      throw error;
    }
  }, 10000);

  afterAll(async () => {
    // Cleanup
    if (boxesInstance) {
      boxesInstance = undefined;
    }
  });

  it("should set the maxMasks to the requested value", async () => {
    if (!boxesInstance) {
      throw new Error("Boxes instance not initialized");
    }
    try {
      const boxInput: SegmentationInput = {
        type: "boxes",
        coordinates: input_bbox,
      };

      // Test with 2 masks
      const result2 = await boxesInstance.inference({
        inputs: {
          polygon: polygonBuilding,
          input: boxInput,
        },
        post_processing_parameters: {
          maxMasks: 2,
        },
      });
      expect(result2.masks.features.length).toEqual(2);
      expect(result2.masks.features).toBeInstanceOf(Array);
      expect(result2.masks.type).toBe("FeatureCollection");

      // Test with 1 mask
      const result1 = await boxesInstance.inference({
        inputs: {
          polygon: polygonBuilding,
          input: boxInput,
        },
        post_processing_parameters: {
          maxMasks: 1,
        },
      });
      expect(result1.masks.features.length).toEqual(1);
      expect(result1.masks.features).toBeInstanceOf(Array);
      expect(result1.masks.type).toBe("FeatureCollection");
    } catch (error) {
      console.error("Error in maxMasks test:", error);
      throw error;
    }
  });
});
