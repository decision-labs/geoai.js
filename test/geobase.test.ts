import { describe, expect, it } from "vitest";
import { Geobase } from "../src/data_providers/geobase";
import { GeoRawImage } from "../src/types/images/GeoRawImage";

describe("Geobase", () => {
  const geobase = new Geobase({
    projectRef: "wmrosdnjsecywfkvxtrw",
    apikey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
    cogImagery:
      "https://oin-hotosm-temp.s3.amazonaws.com/63556b6771072f000580f8cd/0/63556b6771072f000580f8ce.tif",
  });

  const testPolygon = {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-102.32435880218901, 19.534122149436314],
          [-102.32435880218901, 19.533206892620342],
          [-102.32336716973523, 19.533206892620342],
          [-102.32336716973523, 19.534122149436314],
          [-102.32435880218901, 19.534122149436314],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature;

  console.log(JSON.stringify(testPolygon, null, 2));
  it("should return a GeoRawImage when getting an image", async () => {
    const image = await geobase.getImage(testPolygon);
    // console.log(image);
    image.save("merged-geobase.png");
    expect(image).toBeInstanceOf(GeoRawImage);
  });

  it("should return image with correct dimensions", async () => {
    const image = await geobase.getImage(testPolygon);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.channels).toBe(3); // RGB image
  });

  it("should return image with bounds matching input polygon", async () => {
    const image = await geobase.getImage(testPolygon);
    const bounds = image.getBounds();

    // Calculate expected bounds from the polygon coordinates
    const expectedBounds = {
      north: 19.5355563529, // max latitude
      south: 19.5334810868, // min latitude
      east: -102.3219760146, // max longitude
      west: -102.3241669542, // min longitude
    };
    console.log("expectedBounds");
    console.log(expectedBounds);
    console.log("bounds");
    console.log(bounds);

    // Test with appropriate precision for geographic coordinates
    expect(bounds.west).toBeCloseTo(expectedBounds.west, 6);
    expect(bounds.east).toBeCloseTo(expectedBounds.east, 6);
    expect(bounds.south).toBeCloseTo(expectedBounds.south, 6);
    expect(bounds.north).toBeCloseTo(expectedBounds.north, 6);
  });

  it("should generate correct tile URLs", async () => {
    const geobaseInstance = new Geobase({
      projectRef: "wmrosdnjsecywfkvxtrw",
      apikey: "test-key",
      cogImagery: "test-imagery",
    });

    // Access private method for testing URL generation
    const getTileUrl = (geobaseInstance as any).getTileUrlFromTileCoords;
    const url = getTileUrl([123, 456, 18]);

    expect(url).toBe(
      "https://wmrosdnjsecywfkvxtrw.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/18/123/456" +
        "?url=test-imagery&apikey=test-key"
    );
  });
});
