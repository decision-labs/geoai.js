import { bbox as turfBbox } from "@turf/bbox";
import { GeoRawImage } from "../types/images/GeoRawImage";
import { calculateTilesForBbox, getImageFromTiles } from "./common";
import { MapSource } from "./mapsource";

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

export class Geobase extends MapSource {
  projectRef: string;
  cogImagery: string;
  apikey: string;

  constructor(config: GeobaseConfig) {
    super();
    this.projectRef = config.projectRef;
    this.cogImagery = config.cogImagery;
    this.apikey = config.apikey;
  }

  protected getTileUrlFromTileCoords(
    tileCoords: [number, number, number],
    instance: Geobase,
    bands?: number[],
    expression?: string
  ): string {
    const [x, y, z] = tileCoords;
    let baseUrl = `https://${instance.projectRef}.geobase.app/titiler/v1/cog/tiles/WebMercatorQuad/${z}/${x}/${y}?url=${instance.cogImagery}&apikey=${instance.apikey}`;
    if (bands && Array.isArray(bands) && bands.length > 0) {
      baseUrl += bands.map(b => `&bidx=${b}`).join("");
    }
    if (expression && typeof expression === "string") {
      expression = encodeURIComponent(expression);
      baseUrl += `&expression=${expression}`;
    }
    return baseUrl;
  }

  async getImage(
    polygon: any,
    bands?: number[],
    expression?: string,
    zoomLevel?: number,
    requiresSquare: boolean = false // default is false
  ): Promise<GeoRawImage> {
    const bbox = turfBbox(polygon);

    let zoom = 22;

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

    // if require better quality image then un comment this code but it cause problem the resultant grid's columns and rows might not be equal

    // tilesGrid = calculateTilesForBbox(
    //   bbox,
    //   this.getTileUrlFromTileCoords,
    //   zoom + 1,
    //   this
    // );
    return await getImageFromTiles(tilesGrid);
  }
}
