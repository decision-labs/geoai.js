import { ProviderParams } from "@/geobase-ai";

export const mapboxParams: ProviderParams = {
  provider: "mapbox",
  apiKey: process.env.MAPBOX_API_KEY || "test",
  style: "mapbox://styles/mapbox/satellite-v9",
};

export const geobaseParams: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/67ba1d2bec9237a9ebd358a3/0/67ba1d2bec9237a9ebd358a4.tif",
};

export const geobaseParamsSolarPanel: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/solar_panels_davis_ca.tif",
};

export const geobaseParamsShip: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/ships_dubai.tif",
};

export const geobaseParamsCar: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/cars_7cm.tif",
};

export const geobaseParamsWetLand: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/naip/m_4609932_nw_14_1_20100629.tif",
};

export const geobaseParamsImageEmbeddings: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://oin-hotosm-temp.s3.us-east-1.amazonaws.com/662aec6d6049ef00013b8085/0/662aec6d6049ef00013b8086.tif",
};

export const geobaseParamsBuilding: ProviderParams = {
  provider: "geobase",
  projectRef: process.env.GEOBASE_PROJECT_REF || "test-project",
  apikey: process.env.GEOBASE_API_KEY || "test",
  cogImagery:
    "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/naip_train.tif",
};

export const polygonOilStorage = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [54.686191879921466, 24.7598344253214],
        [54.686191879921466, 24.755029520893288],
        [54.69148310706436, 24.755029520893288],
        [54.69148310706436, 24.7598344253214],
        [54.686191879921466, 24.7598344253214],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonBuilding = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-117.59239617156095, 47.653614113446906],
        [-117.59239617156095, 47.652878388765174],
        [-117.59040545822742, 47.652878388765174],
        [-117.59040545822742, 47.653614113446906],
        [-117.59239617156095, 47.653614113446906],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonWetLand = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-99.0983079371952, 46.60892272965549],
        [-99.0983079371952, 46.5949877901148],
        [-99.07778265091567, 46.5949877901148],
        [-99.07778265091567, 46.60892272965549],
        [-99.0983079371952, 46.60892272965549],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonCar = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-95.42148774154262, 29.67906487977089],
        [-95.42148774154262, 29.678781807220446],
        [-95.4210323139897, 29.678781807220446],
        [-95.4210323139897, 29.67906487977089],
        [-95.42148774154262, 29.67906487977089],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonShip = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [55.13452909846484, 25.113936913196113],
        [55.13452909846484, 25.11357075780853],
        [55.135160503410304, 25.11357075780853],
        [55.135160503410304, 25.113936913196113],
        [55.13452909846484, 25.113936913196113],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonSolarPannel = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-121.77483138694643, 38.55347243518358],
        [-121.77483138694643, 38.553215934463736],
        [-121.77421502202081, 38.553215934463736],
        [-121.77421502202081, 38.55347243518358],
        [-121.77483138694643, 38.55347243518358],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonImageEmbeddings = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-13.274105237569302, 8.486797889658092],
        [-13.274105237569302, 8.486630954630655],
        [-13.273928015225778, 8.486630954630655],
        [-13.273928015225778, 8.486797889658092],
        [-13.274105237569302, 8.486797889658092],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [114.84807353432808, -3.449255329675921],
        [114.84807353432808, -3.4502955104658923],
        [114.84870049348092, -3.4502955104658923],
        [114.84870049348092, -3.449255329675921],
        [114.84807353432808, -3.449255329675921],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const input_point = [114.84857638295142, -3.449805712621256];

export const input_bbox = [
  -117.59156514616313, 47.65322697023947, -117.59136143816093, 47.6530458073872,
];
export const quadrants = {
  "north-west": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-119.03578720654966, 47.93559576380332],
          [-119.03578720654966, 47.93440964058456],
          [-119.03381169482759, 47.93440964058456],
          [-119.03381169482759, 47.93559576380332],
          [-119.03578720654966, 47.93559576380332],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "north-east": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [12.41687384999824, 47.88679831140425],
          [12.41687384999824, 47.88572867949793],
          [12.418384927707251, 47.88572867949793],
          [12.418384927707251, 47.88679831140425],
          [12.41687384999824, 47.88679831140425],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "south-east": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [18.585011366402398, -33.9795153718126],
          [18.585011366402398, -33.981483943297555],
          [18.58780408214392, -33.981483943297555],
          [18.58780408214392, -33.9795153718126],
          [18.585011366402398, -33.9795153718126],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
  "south-west": {
    type: "Feature",
    properties: {},
    geometry: {
      coordinates: [
        [
          [-69.23188740486464, -51.60805476501489],
          [-69.23188740486464, -51.609953735377744],
          [-69.22903380530106, -51.609953735377744],
          [-69.22903380530106, -51.60805476501489],
          [-69.23188740486464, -51.60805476501489],
        ],
      ],
      type: "Polygon",
    },
  } as GeoJSON.Feature,
};

export const quadrants_points = {
  "north-west": [-119.03412134909516, 47.93472750933009],
  "north-east": [12.417432949881146, 47.886045665409426],
  "south-east": [18.587564882328365, -33.98004626342711],
  "south-west": [-69.2315934241316, -51.60952167421363],
};

export const polygonReturningNonSquareImage = {
  type: "Feature",
  properties: {
    cogUri:
      "https://huggingface.co/datasets/giswqs/geospatial/resolve/main/naip/m_4609932_nw_14_1_20100629.tif",
  },
  geometry: {
    coordinates: [
      [
        [-99.09284471759247, 46.60368240218915],
        [-99.09284471759247, 46.602249848964505],
        [-99.08158049838012, 46.602249848964505],
        [-99.08158049838012, 46.60368240218915],
        [-99.09284471759247, 46.60368240218915],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const polygonReturningSquareImageVertical = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-99.0893892469291, 46.606426499962225],
        [-99.0893892469291, 46.59686070995582],
        [-99.08877533471995, 46.59686070995582],
        [-99.08877533471995, 46.606426499962225],
        [-99.0893892469291, 46.606426499962225],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;
