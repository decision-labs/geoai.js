import { describe, expect, it, beforeAll } from 'vitest';

import { geoai } from '@/geoai';
import { geobaseParamsBuilding, polygonBuilding } from './constants';
import { GeoRawImage } from '../src/types/images/GeoRawImage';
import { ChangeStarBuildingSegmentation } from '@/models/changestar_building_segmentation';
import { BuildingFootPrintSegmentation } from '@/models/building_footprint_segmentation';
import { modelRegistry } from '@/registry';
import { InferenceParams, ProviderParams } from '@/core/types';
import { geoJsonToGist } from './utils/saveToGist';

const esriParams: ProviderParams = {
  provider: 'esri',
};

const CHANGESTAR_MODEL_ID =
  'geobase/changestar-building-segmentation-vitb';

const changestarTask = {
  task: 'building-footprint-segmentation',
  modelId: CHANGESTAR_MODEL_ID,
  modelParams: { dtype: 'fp32' as const },
};

describe('building-footprint-segmentation ChangeStar model routing', () => {
  it('keeps a single building-footprint-segmentation registry task', () => {
    const entry = modelRegistry.find(
      m => m.task === 'building-footprint-segmentation'
    );
    expect(entry).toBeDefined();
    expect(entry?.description.toLowerCase()).toContain('changestar');
    expect(
      modelRegistry.find(m => m.task === 'changestar-building-segmentation')
    ).toBeUndefined();
  });

  it('exposes ChangeStarBuildingSegmentation class', () => {
    expect(ChangeStarBuildingSegmentation).toBeDefined();
    expect(typeof ChangeStarBuildingSegmentation.getInstance).toBe('function');
  });
});

describe('test ChangeStar via building-footprint-segmentation', () => {
  let changestarInstance: ChangeStarBuildingSegmentation;

  beforeAll(async () => {
    changestarInstance = (await geoai.pipeline(
      [changestarTask],
      esriParams
    )) as ChangeStarBuildingSegmentation;
  }, 120_000);

  it('should initialize ChangeStar when modelId includes changestar', async () => {
    const instance = await geoai.pipeline([changestarTask], esriParams);

    expect(instance).toBeInstanceOf(ChangeStarBuildingSegmentation);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it('should use the default footprint model without changestar modelId', async () => {
    const instance = await geoai.pipeline(
      [{ task: 'building-footprint-segmentation' }],
      esriParams
    );

    expect(instance).toBeInstanceOf(BuildingFootPrintSegmentation);
    expect(instance).not.toBeInstanceOf(ChangeStarBuildingSegmentation);
  });

  it('should reuse the same ChangeStar instance for the same model', async () => {
    const instance1 = await geoai.pipeline([changestarTask], esriParams);
    const instance2 = await geoai.pipeline([changestarTask], esriParams);

    expect(instance1).toBe(instance2);
  });

  it('should create new instances for different providers', async () => {
    const instance1 = await geoai.pipeline([changestarTask], esriParams);
    const instance2 = await geoai.pipeline(
      [changestarTask],
      geobaseParamsBuilding
    );
    expect(instance1).not.toBe(instance2);
  });

  it('should process a building-detection polygon', async () => {
    const inferenceParams: InferenceParams = {
      inputs: {
        polygon: polygonBuilding,
      },
      mapSourceParams: {
        zoomLevel: 18,
      },
    };

    const results = await changestarInstance.inference(inferenceParams);

    expect(results.detections).toBeDefined();
    expect(results.detections.type).toBe('FeatureCollection');
    expect(Array.isArray(results.detections.features)).toBe(true);

    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);

    await geoJsonToGist({
      content: results.detections,
      fileName: 'changestarBuildingSegmentation.geojson',
      description:
        'result changestar via building-footprint-segmentation - should process a building-detection polygon',
    });
  }, 180_000);

  it('should accept a custom confidence threshold', async () => {
    const inferenceParams: InferenceParams = {
      inputs: {
        polygon: polygonBuilding,
      },
      postProcessingParams: {
        confidenceThreshold: 0.7,
      },
      mapSourceParams: {
        zoomLevel: 18,
      },
    };

    const results = await changestarInstance.inference(inferenceParams);

    expect(results.detections).toBeDefined();
    expect(results.detections.type).toBe('FeatureCollection');
    expect(Array.isArray(results.detections.features)).toBe(true);
    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
  }, 180_000);

  it('should reject missing polygon input', async () => {
    await expect(
      changestarInstance.inference({
        inputs: {},
      } as InferenceParams)
    ).rejects.toThrow('Polygon input is required for dense segmentation');
  });

  it('should reject non-polygon geometry', async () => {
    const pointFeature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [-117.5915, 47.6532],
      },
    } as GeoJSON.Feature;

    await expect(
      changestarInstance.inference({
        inputs: {
          polygon: pointFeature,
        },
      })
    ).rejects.toThrow('Input must be a valid GeoJSON Polygon feature');
  });
});

describe('test ChangeStar building footprint with geobase', () => {
  let geobaseInstance: ChangeStarBuildingSegmentation;

  beforeAll(async () => {
    geobaseInstance = (await geoai.pipeline(
      [changestarTask],
      geobaseParamsBuilding
    )) as ChangeStarBuildingSegmentation;
  }, 120_000);

  it('should initialize ChangeStar with geobase', async () => {
    const instance = await geoai.pipeline(
      [changestarTask],
      geobaseParamsBuilding
    );

    expect(instance).toBeInstanceOf(ChangeStarBuildingSegmentation);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it('should process a building-detection polygon with geobase imagery', async () => {
    const inferenceParams: InferenceParams = {
      inputs: {
        polygon: polygonBuilding,
      },
      mapSourceParams: {
        zoomLevel: 18,
      },
    };

    const results = await geobaseInstance.inference(inferenceParams);

    expect(results.detections).toBeDefined();
    expect(results.detections.type).toBe('FeatureCollection');
    expect(Array.isArray(results.detections.features)).toBe(true);

    expect(results.geoRawImage).toBeInstanceOf(GeoRawImage);
    expect(results.geoRawImage.data).toBeDefined();
    expect(results.geoRawImage.width).toBeGreaterThan(0);
    expect(results.geoRawImage.height).toBeGreaterThan(0);

    await geoJsonToGist({
      content: results.detections,
      fileName: 'changestarBuildingSegmentation-geobase.geojson',
      description:
        'result changestar via building-footprint-segmentation - geobase imagery',
    });
  }, 180_000);
});
