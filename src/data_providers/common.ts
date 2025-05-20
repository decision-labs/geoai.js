import { GeoRawImage } from "@/types/images/GeoRawImage";
import { load_image, RawImage } from "@huggingface/transformers";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { tileToBBox } from "global-mercator/index";
const cv = require("@techstark/opencv-js");

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
  expression?: string
): any => {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const topLeft = latLngToTileXY(maxLat, minLng, zoom);
  const bottomRight = latLngToTileXY(minLat, maxLng, zoom);

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

  //need to test below logic if it works then replace it with above code

  //   const [minLng, minLat, maxLng, maxLat] = bbox;

  //   const topLeft = latLngToTileXY(maxLat, minLng, zoom);
  //   const bottomRight = latLngToTileXY(minLat, maxLng, zoom);

  //   // Calculate the maximum dimension
  //   const xTiles = bottomRight.x - topLeft.x + 1;
  //   const yTiles = bottomRight.y - topLeft.y + 1;
  //   const maxTiles = Math.max(xTiles, yTiles);

  //   // Adjust x and y ranges to be equal
  //   const xStart = topLeft.x;
  //   const yStart = topLeft.y;
  //   const xEnd = xStart + maxTiles - 1;
  //   const yEnd = yStart + maxTiles - 1;

  //   const tiles = [];
  //   for (let y = yStart; y <= yEnd; y++) {
  //     const row = [];
  //     for (let x = xStart; x <= xEnd; x++) {
  //       row.push({
  //         tile: [x, y, zoom],
  //         tileUrl: mercatorTileURLGetter([x, y, zoom], instance),
  //         tileGeoJson: turfBboxPolygon(tileToBBox([x, y, zoom])),
  //       });
  //     }
  //     tiles.push(row);
  //   }

  //   return tiles;
};

const rawImageToMat = async (rawImage: RawImage): Promise<any> => {
  const { width, height } = rawImage;
  let data = rawImage.data;

  // Convert Uint8Array to OpenCV.js Mat
  const channels = rawImage.channels;
  const matType =
    channels === 1 ? cv.CV_8UC1 : channels === 3 ? cv.CV_8UC3 : cv.CV_8UC4;
  const mat = new cv.Mat(height, width, matType);
  mat.data.set(new Uint8Array(data)); // Directly set the data

  return mat;
};

// Stitch 2D grid of images
const stitchImageGrid = async (imageGrid: RawImage[][]) => {
  const rowMats = [];

  for (const row of imageGrid) {
    const rowMatsConverted = await Promise.all(row.map(rawImageToMat));

    let rowMat = rowMatsConverted[0];
    for (let i = 1; i < rowMatsConverted.length; i++) {
      const tempMat = new cv.Mat();
      const matVector = new cv.MatVector();
      matVector.push_back(rowMat);
      matVector.push_back(rowMatsConverted[i]);
      await cv.hconcat(matVector, tempMat);
      matVector.delete();
      rowMat = tempMat;
    }
    rowMats.push(rowMat);
  }

  let finalImage = rowMats[0];
  for (let i = 1; i < rowMats.length; i++) {
    const tempMat = new cv.Mat();
    const matVector = new cv.MatVector();
    matVector.push_back(finalImage);
    matVector.push_back(rowMats[i]);
    await cv.vconcat(matVector, tempMat);
    matVector.delete();
    finalImage = tempMat;
  }
  // Convert the final image to a RawImage
  const finalImageData = new Uint8ClampedArray(
    finalImage.data.buffer,
    finalImage.data.byteOffset,
    finalImage.data.length
  );
  const finalRawImage = new RawImage(
    finalImageData,
    finalImage.cols,
    finalImage.rows,
    finalImage.channels()
  );
  // Cleanup memory
  rowMats.forEach(mat => mat.delete());
  // Mat instance already deleted

  //   await finalRawImage.save("stitched_image.png");

  return finalRawImage;
};

export const getImageFromTiles = async (
  tilesGrid: any
): Promise<GeoRawImage> => {
  const tileUrlsGrid = tilesGrid.map((row: any) =>
    row.map((tile: any) => tile.tileUrl)
  );
  // Load all images in parallel
  const tileImages: RawImage[][] = await Promise.all(
    tileUrlsGrid.map((row: any) =>
      Promise.all(row.map((url: string) => load_image(url)))
    )
  );
  const stitchedImage = await stitchImageGrid(tileImages);
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
  //   const bounds = {
  //     north: Math.max(
  //       tilesGrid[0][0].tileGeoJson.bbox[3], // Top-left
  //       tilesGrid[0][tilesGrid[0].length - 1].tileGeoJson.bbox[3] // Top-right
  //     ),
  //     south: Math.min(
  //       tilesGrid[tilesGrid.length - 1][0].tileGeoJson.bbox[1], // Bottom-left
  //       tilesGrid[tilesGrid.length - 1][tilesGrid[0].length - 1].tileGeoJson
  //         .bbox[1] // Bottom-right
  //     ),
  //     east: Math.max(
  //       tilesGrid[0][tilesGrid[0].length - 1].tileGeoJson.bbox[2], // Top-right
  //       tilesGrid[tilesGrid.length - 1][tilesGrid[0].length - 1].tileGeoJson
  //         .bbox[2] // Bottom-right
  //     ),
  //     west: Math.min(
  //       tilesGrid[0][0].tileGeoJson.bbox[0], // Top-left
  //       tilesGrid[tilesGrid.length - 1][0].tileGeoJson.bbox[0] // Bottom-left
  //     ),
  //   };

  //save the stitched image to a file
  // await stitchedImage.save("stitched_image_wetland.png");

  return GeoRawImage.fromRawImage(stitchedImage, bounds, "EPSG:4326");
};
