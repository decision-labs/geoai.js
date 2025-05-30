import { bbox as turfBbox } from "@turf/bbox";
import { GeoRawImage } from "../types/images/GeoRawImage";
import { calculateTilesForBbox, getImageFromTiles } from "./common";

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

export abstract class MapSource {
  protected abstract getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: any,
    bands?: number[],
    expression?: string
  ): string;

  async getImage(
    polygon: any,
    bands?: number[],
    expression?: string,
    zoomLevel?: number,
    requiresSquare: boolean = false // default is false
  ): Promise<GeoRawImage> {
    const bbox = turfBbox(polygon);
    const initialSearchZoom = 22;

    if (zoomLevel) {
      const tilesGrid = calculateTilesForBbox(
        bbox,
        this.getTileUrlFromTileCoords,
        zoomLevel,
        this,
        bands,
        expression,
        requiresSquare
      );
      return await getImageFromTiles(tilesGrid);
    }

    let zoom = initialSearchZoom;

    let tilesGrid = calculateTilesForBbox(
      bbox,
      this.getTileUrlFromTileCoords,
      zoom,
      this,
      bands,
      expression,
      requiresSquare
    );

    let xTileNum = tilesGrid[0].length;
    let yTileNum = tilesGrid.length;

    while (
      xTileNum > 2 &&
      yTileNum > 2
      // (xTileNum === 1 && yTileNum === 1 && zoom > 22) ||
      // (xTileNum > 2 && yTileNum > 1) ||
      // (xTileNum > 1 && yTileNum > 2)
    ) {
      zoom--;
      tilesGrid = calculateTilesForBbox(
        bbox,
        this.getTileUrlFromTileCoords,
        zoom,
        this,
        bands,
        expression,
        requiresSquare
      );
      xTileNum = tilesGrid[0].length;
      yTileNum = tilesGrid.length;
    }

    return await getImageFromTiles(tilesGrid);
  }
}
