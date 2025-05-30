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
}
