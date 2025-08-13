import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { geoai } from "@/geobase-ai";
import {
  MaskGeneration,
  SegmentationInput,
} from "../src/models/mask_generation";
import {
  geobaseParams,
  geobaseParamsBuilding,
  geobaseParamsImageEmbeddings,
  input_bbox,
  input_point,
  mapboxParams,
  polygon,
  polygonBuilding,
  polygonImageEmbeddings,
  quadrants,
  quadrants_points,
} from "./constants";
import { geoJsonToGist } from "./utils/saveToGist";

describe("geoai.maskGeneration", () => {
  let mapboxInstance: MaskGeneration | undefined;
  let geobaseInstance: MaskGeneration | undefined;
  let geobaseBuildingInstance: MaskGeneration | undefined;

  beforeAll(async () => {
    try {
      // Initialize instances for reuse across tests
      mapboxInstance = await geoai.pipeline(
        [{ task: "mask-generation" }],
        mapboxParams
      );

      geobaseInstance = await geoai.pipeline(
        [{ task: "mask-generation" }],
        geobaseParams
      );

      geobaseBuildingInstance = await geoai.pipeline(
        [
          {
            task: "mask-generation",
            modelId: "Xenova/slimsam-77-uniform",
            modelParams: { revision: "boxes" },
          },
        ],
        geobaseParamsBuilding
      );
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
    const instance = await geoai.pipeline(
      [{ task: "mask-generation" }],
      mapboxParams
    );
    expect(instance).toBeInstanceOf(MaskGeneration);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it("should reuse the same instance for the same model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "mask-generation" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: "mask-generation" }],
      mapboxParams
    );
    expect(instance1).toBe(instance2);
  });

  it("should create a new instance for different configurations of the model", async () => {
    const instance1 = await geoai.pipeline(
      [{ task: "mask-generation" }],
      mapboxParams
    );
    const instance2 = await geoai.pipeline(
      [
        {
          task: "mask-generation",
          modelId: "Xenova/slimsam-77-uniform",
          modelParams: {
            revision: "boxes",
            cache_dir: "./cache",
          },
        },
      ],
      mapboxParams
    );
    expect(instance1.model).not.toBe(instance2.model);
    expect(instance1).not.toBe(instance2);
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
        await geoai.pipeline(
          [
            {
              task: "mask-generation",
              modelId: "Xenova/slimsam-77-uniform",
              modelParams: options,
            },
          ],
          mapboxParams
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
          fileName: "maskGenerationMapbox.geojson",
          description:
            "result maskGeneration - should process a polygon for segmentation and generate valid GeoJSON",
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
      fileName: "maskGenerationGeobase.geojson",
      description:
        "result maskGeneration - should process a polygon for segmentation and generate valid GeoJSON for source geobase with point",
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
      fileName: "maskGenerationGeobaseBoxes.geojson",
      description:
        "result maskGeneration - should process a polygon for segmentation and generate valid GeoJSON for source geobase with boxes",
    });
  });
});

describe("boxes pipeline with thresholds parameter", () => {
  let boxesInstance: MaskGeneration | undefined;

  beforeAll(async () => {
    try {
      boxesInstance = await geoai.pipeline(
        [
          {
            task: "mask-generation",
            modelId: "Xenova/slimsam-77-uniform",
            modelParams: { revision: "boxes" },
          },
        ],
        geobaseParamsBuilding
      );
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
        postProcessingParams: {
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
        postProcessingParams: {
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

describe("getImageEmbeddings", () => {
  let imageEmbeddingsInstance: MaskGeneration | undefined;

  beforeAll(async () => {
    try {
      imageEmbeddingsInstance = await geoai.pipeline(
        [{ task: "mask-generation" }],
        geobaseParamsImageEmbeddings
      );
    } catch (error) {
      console.error("Error initializing image embeddings instance:", error);
      throw error;
    }
  }, 100000); // Increased timeout for model loading

  afterAll(async () => {
    if (imageEmbeddingsInstance) {
      imageEmbeddingsInstance = undefined;
    }
  });

  it("should generate image embeddings for a given polygon", async () => {
    if (!imageEmbeddingsInstance) {
      throw new Error("Image embeddings instance not initialized");
    }

    try {
      const result = await imageEmbeddingsInstance.getImageEmbeddings({
        inputs: {
          polygon: polygonImageEmbeddings,
        },
        mapSourceParams: {
          zoomLevel: 20,
        },
      });

      const image_embeddings = result.image_embeddings.image_embeddings;

      expect(result).toBeDefined();
      expect(result).not.toBeNull();

      // Check if the result has the expected structure
      expect(result).toHaveProperty("image_embeddings");
      expect(result).toHaveProperty("geoRawImage");

      // Validate image_embeddings structure
      expect(image_embeddings).toBeDefined();
      expect(image_embeddings).toHaveProperty("data");
      expect(image_embeddings.data).toBeInstanceOf(Float32Array);
      expect(image_embeddings).toHaveProperty("dims");
      expect(image_embeddings.dims).toBeInstanceOf(Array);
      expect(image_embeddings.dims.length).toBeGreaterThan(0);

      // Validate geoRawImage structure
      expect(result.geoRawImage).toBeDefined();
      expect(result.geoRawImage).not.toBeNull();
      expect(result.geoRawImage).toHaveProperty("width");
      expect(result.geoRawImage).toHaveProperty("height");

      console.log("Image embeddings shape:", image_embeddings.dims);
      console.log("Image embeddings data type:", typeof image_embeddings.data);
      console.log(
        "Image embeddings data length:",
        image_embeddings.data.length
      );
      console.log(
        "GeoRawImage dimensions:",
        result.geoRawImage.width,
        "x",
        result.geoRawImage.height
      );
    } catch (error) {
      console.error("Error generating image embeddings:", error);
      throw error;
    }
  }, 60000); // Extended timeout for inference
});
