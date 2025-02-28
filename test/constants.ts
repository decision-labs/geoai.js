import { ProviderParams } from "../src/geobase-ai";

export const mapboxParams: ProviderParams = {
  provider: "mapbox",
  apiKey:
    "pk.eyJ1Ijoic2FiIiwiYSI6ImNsNDE3bGR3bzB2MmczaXF5dmxpaTloNmcifQ.NQ-B8jBPtOd53tNYt42Gqw",
  style: "mapbox://styles/mapbox/satellite-v9",
};

export const geobaseParams: ProviderParams = {
  provider: "geobase",
  projectRef: "wmrosdnjsecywfkvxtrw",
  apikey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4OTY1NDU4MjUsImlhdCI6MTczODc2MTQyNSwiaXNzIjoic3VwYWJhc2UiLCJyb2xlIjoiYW5vbiJ9.M8jeru5dbHe4tGh52xe2E2HlUiGCAPbZ8-JrfbxiRk0",
  cogImagery:
    "https://oin-hotosm-temp.s3.amazonaws.com/63556b6771072f000580f8cd/0/63556b6771072f000580f8ce.tif",
};

export const polygon = {
  type: "Feature",
  properties: {},
  geometry: {
    coordinates: [
      [
        [-102.32245205602885, 19.536415661502275],
        [-102.32245205602885, 19.534836349733624],
        [-102.32080637971754, 19.534836349733624],
        [-102.32080637971754, 19.536415661502275],
        [-102.32245205602885, 19.536415661502275],
      ],
    ],
    type: "Polygon",
  },
} as GeoJSON.Feature;

export const input_point = [-102.32207526163147, 19.53570142468871];

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
