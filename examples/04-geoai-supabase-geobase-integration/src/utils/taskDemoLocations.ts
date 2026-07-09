/** Demo map locations aligned with live-examples-nextjs task pages */

export interface TaskDemoLocation {
  task: string;
  label: string;
  placeName: string;
  center: [number, number];
  zoom: number;
  /** [west, south, east, north] */
  bounds: [number, number, number, number];
  cogImageryUrl: string;
  accent: string;
}

const COG_BASE = 'https://huggingface.co/datasets/geobase/geoai-cogs/resolve/main';

const ringToBounds = (ring: number[][]): [number, number, number, number] => {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of ring) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }

  return [west, south, east, north];
};

export const TASK_DEMO_LOCATIONS: Record<string, TaskDemoLocation> = {
  'zero-shot-object-detection': {
    task: 'zero-shot-object-detection',
    label: 'Zero-shot Objects',
    placeName: 'Cancún, Mexico',
    center: [-87.06908566748001, 20.653232827552685],
    zoom: 20,
    bounds: ringToBounds([
      [-87.0695, 20.6538],
      [-87.0685, 20.6538],
      [-87.0685, 20.6526],
      [-87.0695, 20.6526],
      [-87.0695, 20.6538],
    ]),
    cogImageryUrl: `${COG_BASE}/zero-shot-object-detection.tif`,
    accent: '#f46d43',
  },
  'oil-storage-tank-detection': {
    task: 'oil-storage-tank-detection',
    label: 'Oil Tanks',
    placeName: 'Dubai, UAE',
    center: [54.690310447932006, 24.75763471820723],
    zoom: 15,
    bounds: ringToBounds([
      [54.686191879921466, 24.7598344253214],
      [54.686191879921466, 24.755029520893288],
      [54.69148310706436, 24.755029520893288],
      [54.69148310706436, 24.7598344253214],
      [54.686191879921466, 24.7598344253214],
    ]),
    cogImageryUrl: `${COG_BASE}/object-detection.tif`,
    accent: '#ee5a94',
  },
  'solar-panel-detection': {
    task: 'solar-panel-detection',
    label: 'Solar Panels',
    placeName: 'Davis, CA',
    center: [-121.7743491, 38.5533061],
    zoom: 21,
    bounds: ringToBounds([
      [-121.77483138694643, 38.55347243518358],
      [-121.77483138694643, 38.553215934463736],
      [-121.77421502202081, 38.553215934463736],
      [-121.77421502202081, 38.55347243518358],
      [-121.77483138694643, 38.55347243518358],
    ]),
    cogImageryUrl: `${COG_BASE}/solar-panel-detection.tif`,
    accent: '#2ba99a',
  },
  'building-detection': {
    task: 'building-detection',
    label: 'Buildings',
    placeName: 'Spokane, WA',
    center: [-117.59159209938863, 47.65325850830081],
    zoom: 18,
    bounds: ringToBounds([
      [-117.59239617156095, 47.653614113446906],
      [-117.59239617156095, 47.652878388765174],
      [-117.59040545822742, 47.652878388765174],
      [-117.59040545822742, 47.653614113446906],
      [-117.59239617156095, 47.653614113446906],
    ]),
    cogImageryUrl: `${COG_BASE}/building-detection.tif`,
    accent: '#4a9eff',
  },
  'car-detection': {
    task: 'car-detection',
    label: 'Cars',
    placeName: 'Houston, TX',
    center: [-95.42142391922613, 29.67899312759792],
    zoom: 21,
    bounds: ringToBounds([
      [-95.42148774154262, 29.67906487977089],
      [-95.42148774154262, 29.678781807220446],
      [-95.4210323139897, 29.678781807220446],
      [-95.4210323139897, 29.67906487977089],
      [-95.42148774154262, 29.67906487977089],
    ]),
    cogImageryUrl: `${COG_BASE}/car-detection.tif`,
    accent: '#3ecf8e',
  },
  'ship-detection': {
    task: 'ship-detection',
    label: 'Ships',
    placeName: 'Dubai Port, UAE',
    center: [55.13477831801109, 25.111226405681208],
    zoom: 20,
    bounds: ringToBounds([
      [55.13452909846484, 25.113936913196113],
      [55.13452909846484, 25.11357075780853],
      [55.135160503410304, 25.11357075780853],
      [55.135160503410304, 25.113936913196113],
      [55.13452909846484, 25.113936913196113],
    ]),
    cogImageryUrl: `${COG_BASE}/ship-detection.tif`,
    accent: '#ecc94b',
  },
  'land-cover-classification': {
    task: 'land-cover-classification',
    label: 'Land Cover',
    placeName: 'Saskatchewan, Canada',
    center: [-99.98154044151306, 50.642806912434835],
    zoom: 19,
    bounds: ringToBounds([
      [-99.985, 50.646],
      [-99.985, 50.640],
      [-99.978, 50.640],
      [-99.978, 50.646],
      [-99.985, 50.646],
    ]),
    cogImageryUrl: `${COG_BASE}/object-detection.tif`,
    accent: '#9b7bff',
  },
  'image-feature-extraction': {
    task: 'image-feature-extraction',
    label: 'Image Embeddings',
    placeName: 'Balikpapan, Indonesia',
    center: [114.84901, -3.449806],
    zoom: 20,
    bounds: ringToBounds([
      [114.84807353432808, -3.449255329675921],
      [114.84807353432808, -3.4502955104658923],
      [114.84870049348092, -3.4502955104658923],
      [114.84870049348092, -3.449255329675921],
      [114.84807353432808, -3.449255329675921],
    ]),
    cogImageryUrl: `${COG_BASE}/object-detection.tif`,
    accent: '#9b7bff',
  },
};

export const getTaskDemoLocation = (task: string): TaskDemoLocation | undefined =>
  TASK_DEMO_LOCATIONS[task];
