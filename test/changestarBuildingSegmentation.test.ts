import { describe, expect, it, beforeAll } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { geoai } from '@/geoai';
import { geobaseParamsBuilding, polygonBuilding } from './constants';
import { GeoRawImage } from '../src/types/images/GeoRawImage';
import { ChangeStarBuildingSegmentation } from '@/models/changestar_building_segmentation';
import { modelRegistry } from '@/registry';
import { InferenceParams, ProviderParams } from '@/core/types';
import { geoJsonToGist } from './utils/saveToGist';

const esriParams: ProviderParams = {
  provider: 'esri',
};

describe('changestar-building-segmentation registry', () => {
  it('registers ChangeStar building segmentation with the expected default model', () => {
    const entry = modelRegistry.find(
      m => m.task === 'changestar-building-segmentation'
    );
    expect(entry).toBeDefined();
    expect(entry?.library).toBe('geoai');
    expect(entry?.description.toLowerCase()).toContain('changestar');
    expect(entry?.examples.length).toBeGreaterThan(0);
  });

  it('exposes ChangeStarBuildingSegmentation class', () => {
    expect(ChangeStarBuildingSegmentation).toBeDefined();
    expect(typeof ChangeStarBuildingSegmentation.getInstance).toBe('function');
  });
});

describe('test model changestar building segmentation', () => {
  let changestarInstance: ChangeStarBuildingSegmentation;

  beforeAll(async () => {
    changestarInstance = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      esriParams
    );
  }, 120_000);

  it('should initialize a ChangeStar building segmentation pipeline', async () => {
    const instance = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      esriParams
    );

    expect(instance).toBeInstanceOf(ChangeStarBuildingSegmentation);
    expect(instance).toBeDefined();
    expect(instance).not.toBeNull();
  });

  it('should reuse the same instance for the same model', async () => {
    const instance1 = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      esriParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      esriParams
    );

    expect(instance1).toBe(instance2);
  });

  it('should create new instances for different configurations', async () => {
    const instance1 = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      esriParams
    );
    const instance2 = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
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

    const outputDir = join(process.cwd(), 'test', 'output');
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(
      outputDir,
      'changestarBuildingSegmentation.geojson'
    );
    await writeFile(
      outputPath,
      JSON.stringify(results.detections, null, 2),
      'utf-8'
    );

    await geoJsonToGist({
      content: results.detections,
      fileName: 'changestarBuildingSegmentation.geojson',
      description:
        'result changestarBuildingSegmentation - should process a building-detection polygon',
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

describe('test model changestar building segmentation with geobase', () => {
  let geobaseInstance: ChangeStarBuildingSegmentation;

  beforeAll(async () => {
    geobaseInstance = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
      geobaseParamsBuilding
    );
  }, 120_000);

  it('should initialize a ChangeStar pipeline with geobase', async () => {
    const instance = await geoai.pipeline(
      [{ task: 'changestar-building-segmentation' }],
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

    const outputDir = join(process.cwd(), 'test', 'output');
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(
      outputDir,
      'changestarBuildingSegmentation-geobase.geojson'
    );
    await writeFile(
      outputPath,
      JSON.stringify(results.detections, null, 2),
      'utf-8'
    );

    await geoJsonToGist({
      content: results.detections,
      fileName: 'changestarBuildingSegmentation-geobase.geojson',
      description:
        'result changestarBuildingSegmentation - should process a building-detection polygon with geobase imagery',
    });
  }, 180_000);
});
