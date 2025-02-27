import { bbox as turfBbox } from "@turf/bbox";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { pointToTile, tileToBBox } from "global-mercator/index";
import { load_image, RawImage } from "@huggingface/transformers";
import { GeoRawImage } from "../types/images/GeoRawImage";

const addChain = (receiver: any) =>
  Object.defineProperty(receiver.prototype, "chain", {
    value: function (intercept: any) {
      let val = this.valueOf ? this.valueOf() : this;
      return intercept(val);
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });

[Object, String, Number, Boolean].map(receiver => {
  addChain(receiver);
});

interface GeobaseConfig {
  projectRef: string;
  cogImagery: string;
  apikey: string;
}

export class Geobase {
  projectRef: string;
  cogImagery: string;
  apikey: string;

  constructor(config: GeobaseConfig) {
    this.projectRef = config.projectRef;
    this.cogImagery = config.cogImagery;
    this.apikey = config.apikey;
  }

  private getTileUrlFromTileCoords(
    tileCoords: [number, number, number]
  ): string {
    const [x, y, z] = tileCoords;
    return `https://${this.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/${z}/${x}/${y}?url=${this.cogImagery}&apikey=${this.apikey}`;
  }

  async getImage(polygon: any) {
    const bbox = turfBbox(polygon);
    let zoom = 22;
    // get tile for each of the 4 corners of the bbox

    let tiles = this.calculateTilesForBbox(bbox, zoom);

    // get number of tiles by each edge of the bbox
    let xTileNum =
      Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
    let yTileNum =
      Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;

    while (xTileNum > 2 && yTileNum > 2) {
      zoom--;
      tiles = this.calculateTilesForBbox(bbox, zoom);
      xTileNum =
        Math.abs(tiles.bottomleft.tile[0] - tiles.bottomright.tile[0]) + 1;
      yTileNum = Math.abs(tiles.bottomleft.tile[1] - tiles.topleft.tile[1]) + 1;
    }

    // anti-clockwise order
    const tileUrls = [
      tiles.bottomleft.tileGeoJson?.properties?.tileUrl,
      tiles.bottomright.tileGeoJson?.properties?.tileUrl,
      tiles.topright.tileGeoJson?.properties?.tileUrl,
      tiles.topleft.tileGeoJson?.properties?.tileUrl,
    ];

    // Load images per tile and store their bounding boxes
    const tilesWithMetadata = await Promise.all(
      tileUrls.map(async (url, index) => {
        const tileGeoJson = [
          tiles.bottomleft.tileGeoJson,
          tiles.bottomright.tileGeoJson,
          tiles.topright.tileGeoJson,
          tiles.topleft.tileGeoJson,
        ][index];

        return {
          image: await load_image(url),
          bbox: tileGeoJson.bbox as [number, number, number, number],
        };
      })
    );

    // Merge the images and create a GeoRawImage
    const { image: mergedImage, bounds } =
      this.mergeRawImages(tilesWithMetadata);

    console.log(bounds);
    return GeoRawImage.fromRawImage(mergedImage, bounds, "EPSG:4326");
  }

  calculateTilesForBbox = (
    bbox: number[],
    zoom: number
  ): {
    bottomleft: {
      coords: number[];
      tile: number[];
      tileGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
    };
    bottomright: {
      coords: number[];
      tile: number[];
      tileGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
    };
    topleft: {
      coords: number[];
      tile: number[];
      tileGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
    };
    topright: {
      coords: number[];
      tile: number[];
      tileGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
    };
  } => {
    const getTileGeoJson = (bbox: any, zoom: number) => {
      const feature = turfBboxPolygon(tileToBBox(pointToTile(bbox, zoom)));
      feature.properties = {
        tileCoords: pointToTile(bbox, zoom),
        tileUrl: this.getTileUrlFromTileCoords(pointToTile(bbox, zoom)),
      };
      return feature;
    };

    return {
      bottomleft: {
        coords: [bbox[0], bbox[1]],
        tile: pointToTile([bbox[0], bbox[1]], zoom),
        tileGeoJson: getTileGeoJson([bbox[0], bbox[1]], zoom),
      },
      bottomright: {
        coords: [bbox[2], bbox[1]],
        tile: pointToTile([bbox[2], bbox[1]], zoom),
        tileGeoJson: getTileGeoJson([bbox[2], bbox[1]], zoom),
      },
      topleft: {
        coords: [bbox[0], bbox[3]],
        tile: pointToTile([bbox[0], bbox[3]], zoom),
        tileGeoJson: getTileGeoJson([bbox[0], bbox[3]], zoom),
      },
      topright: {
        coords: [bbox[2], bbox[3]],
        tile: pointToTile([bbox[2], bbox[3]], zoom),
        tileGeoJson: getTileGeoJson([bbox[2], bbox[3]], zoom),
      },
    };
  };

  // Reuse the same mergeRawImages method from Mapbox class
  mergeRawImages(
    tiles: Array<{ image: RawImage; bbox: [number, number, number, number] }>
  ) {
    // Each image has the same dimensions and number of channels
    // assuming all tiles have the same dimensions and number of channels
    const tileWidth = tiles[0].image.width;
    const tileHeight = tiles[0].image.height;
    const channels = tiles[0].image.channels;

    // Final image dimensions (2x2 grid)
    const finalWidth = tileWidth * 2;
    const finalHeight = tileHeight * 2;
    const finalData = new Uint8ClampedArray(
      finalWidth * finalHeight * channels
    );

    // Helper function to copy a single tile into the final image
    // takes the source image, the destination image, the offset x and y
    // and copies the tile into the final image at the specified offset
    function copyTileToFinalImage(
      source: Uint8ClampedArray | Uint8Array,
      dest: Uint8ClampedArray,
      offsetX: number,
      offsetY: number
    ) {
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          const sourceIndex = (y * tileWidth + x) * channels;
          const destIndex =
            ((offsetY + y) * finalWidth + (offsetX + x)) * channels;

          for (let c = 0; c < channels; c++) {
            dest[destIndex + c] = source[sourceIndex + c];
          }
        }
      }
    }

    // Place each tile in the 2x2 grid
    copyTileToFinalImage(tiles[0].image.data, finalData, 0, tileHeight); // Bottom-left
    copyTileToFinalImage(tiles[1].image.data, finalData, tileWidth, tileHeight); // Bottom-right
    copyTileToFinalImage(tiles[2].image.data, finalData, tileWidth, 0); // Top-right
    copyTileToFinalImage(tiles[3].image.data, finalData, 0, 0); // Top-left

    // Calculate combined bounds
    const bounds = {
      north: Math.max(...tiles.map(t => t.bbox[1])),
      south: Math.min(...tiles.map(t => t.bbox[3])),
      east: Math.max(...tiles.map(t => t.bbox[2])),
      west: Math.min(...tiles.map(t => t.bbox[0])),
    };

    return {
      image: new RawImage(finalData, finalWidth, finalHeight, channels),
      bounds,
    };
  }
}
