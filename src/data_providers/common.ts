import { GeoRawImage } from "@/types/images/GeoRawImage";
import { load_image, RawImage } from "@huggingface/transformers";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { tileToBBox } from "global-mercator/index";
import { GeobaseError, ErrorType } from "../errors";

const latLngToTileXY = (
  lat: number,
  lng: number,
  zoom: number
): {
  x: number;
  y: number;
} => {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      n
  );
  return { x, y };
};

export const calculateTilesForBbox = (
  bbox: number[],
  mercatorTileURLGetter: (
    tileCoords: [number, number, number],
    instance: any,
    bands?: number[],
    expression?: string
  ) => string,
  zoom: number,
  instance?: any,
  bands?: number[],
  expression?: string,
  square: boolean = false // default is false
): any => {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const topLeft = latLngToTileXY(maxLat, minLng, zoom);
  const bottomRight = latLngToTileXY(minLat, maxLng, zoom);

  const xTilesCount = bottomRight.x - topLeft.x + 1;
  const yTilesCount = bottomRight.y - topLeft.y + 1;

  if (square && xTilesCount !== yTilesCount) {
    if (xTilesCount > yTilesCount) {
      const yChange = xTilesCount - yTilesCount;

      topLeft.y = topLeft.y - Math.floor(yChange / 2);
      bottomRight.y = bottomRight.y + Math.floor(yChange / 2);

      if (yChange % 2 !== 0) {
        bottomRight.y = bottomRight.y + 1;
      }
    } else if (yTilesCount > xTilesCount) {
      const xChange = yTilesCount - xTilesCount;

      topLeft.x = topLeft.x - Math.floor(xChange / 2);
      bottomRight.x = bottomRight.x + Math.floor(xChange / 2);

      if (xChange % 2 !== 0) {
        bottomRight.x = bottomRight.x + 1;
      }
    }
  }

  const tiles = [];
  for (let y = topLeft.y; y <= bottomRight.y; y++) {
    const row = [];
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      row.push({
        tile: [x, y, zoom],
        tileUrl: mercatorTileURLGetter(
          [x, y, zoom],
          instance,
          bands,
          expression
        ),
        tileGeoJson: turfBboxPolygon(tileToBBox([x, y, zoom])),
      });
    }
    tiles.push(row);
  }

  return tiles;
};

export const getImageFromTiles = async (
  tilesGrid: any,
  stitch: boolean = true
): Promise<GeoRawImage | GeoRawImage[][]> => {
  // Throw error if tile count exceeds maximum
  const MAX_TILE_COUNT = 100; // Set your desired maximum here
  if (tilesGrid.length * tilesGrid[0].length > MAX_TILE_COUNT) {
    throw new GeobaseError(
      ErrorType.MaximumTileCountExceeded,
      `Requested ${tilesGrid.length * tilesGrid[0].length} tiles, which exceeds the maximum allowed (${MAX_TILE_COUNT}).`
    );
  }
  const tileUrlsGrid = tilesGrid.map((row: any) =>
    row.map((tile: any) => tile.tileUrl)
  );
  // Load all images in parallel
  const tileImages: RawImage[][] = await Promise.all(
    tileUrlsGrid.map((row: any) =>
      Promise.all(row.map(async (url: string) => await load_image(url)))
    )
  );
  const cornerTiles = [
    tilesGrid[0][0], // Top-left
    tilesGrid[0][tilesGrid[0].length - 1], // Top-right
    tilesGrid[tilesGrid.length - 1][0], // Bottom-left
    tilesGrid[tilesGrid.length - 1][tilesGrid[0].length - 1], // Bottom-right
  ];
  // Calculate the bounds of the stitched image
  // Assuming the tiles are in the order: top-left, top-right, bottom-left, bottom-right
  const bounds = {
    north: Math.max(
      ...cornerTiles.map((tile: any) => tile.tileGeoJson.bbox[1])
    ),
    south: Math.min(
      ...cornerTiles.map((tile: any) => tile.tileGeoJson.bbox[3])
    ),
    east: Math.max(...cornerTiles.map((tile: any) => tile.tileGeoJson.bbox[2])),
    west: Math.min(...cornerTiles.map((tile: any) => tile.tileGeoJson.bbox[0])),
  };
  if (stitch) {
    return GeoRawImage.fromPatches(tileImages, bounds, "EPSG:4326");
  }

  // If not stitching, set bounds for each individual GeoRawImage
  const geoRawImages: GeoRawImage[][] = tilesGrid.map(
    (row: any, rowIndex: number) =>
      row.map((tile: any, colIndex: number) => {
        const tileBounds = {
          north: tile.tileGeoJson.bbox[1],
          south: tile.tileGeoJson.bbox[3],
          east: tile.tileGeoJson.bbox[2],
          west: tile.tileGeoJson.bbox[0],
        };
        return GeoRawImage.fromRawImage(
          tileImages[rowIndex][colIndex],
          tileBounds,
          "EPSG:4326"
        );
      })
  );

  return geoRawImages;
};
