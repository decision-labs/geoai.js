import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  attachDrawSimilarities,
  buildMeanAnchorVector,
  cosineDistance,
  cosineSimilarity,
  getCoveredEmbeddingFeatures
} from '../src/utils/embeddingSimilarity.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('embeddingSimilarity helpers', () => {
  it('computes cosine similarity and distance', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(cosineDistance([1, 0, 0], [1, 0, 0])).toBeCloseTo(0, 6);
  });

  it('builds a mean anchor vector from covered features', () => {
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 2], [1, 2], [1, 1], [0, 1], [0, 2]]]
        },
        properties: { embedding_vector: [1, 3, 5] }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[1, 2], [2, 2], [2, 1], [1, 1], [1, 2]]]
        },
        properties: { embedding_vector: [3, 5, 7] }
      }
    ];

    const polygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1, 3], [3, 3], [3, 0], [-1, 0], [-1, 3]]]
      },
      properties: {}
    };

    const covered = getCoveredEmbeddingFeatures(features, polygon);
    const mean = buildMeanAnchorVector(covered);
    expect(mean).toEqual([2, 4, 6]);
  });

  it('adds draw_similarity and supports threshold filtering semantics', () => {
    const collection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 2], [1, 2], [1, 1], [0, 1], [0, 2]]]
          },
          properties: { patch_index: 0, embedding_vector: [1, 0] }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[1, 2], [2, 2], [2, 1], [1, 1], [1, 2]]]
          },
          properties: { patch_index: 1, embedding_vector: [0, 1] }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[2, 2], [3, 2], [3, 1], [2, 1], [2, 2]]]
          },
          properties: { patch_index: 2, embedding_vector: [1, 1] }
        }
      ]
    };

    const polygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1, 3], [2.5, 3], [2.5, 0], [-1, 0], [-1, 3]]]
      },
      properties: {}
    };

    const withSimilarity = attachDrawSimilarities(collection, polygon);
    const scores = withSimilarity.features.map((feature) => feature.properties.draw_similarity);

    expect(scores[0]).toBeCloseTo(0.707106, 5);
    expect(scores[1]).toBeCloseTo(0.707106, 5);
    expect(scores[2]).toBeCloseTo(1, 6);

    const threshold = 0.8;
    const matched = withSimilarity.features.filter(
      (feature) => feature.properties.draw_similarity >= threshold
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].properties.patch_index).toBe(2);
  });
});

describe('real fixture schema', () => {
  it('contains image-feature-extraction features with similarity arrays', () => {
    const fixturePath = join(
      __dirname,
      'fixtures',
      'detection-results-2026-03-05.subset.json'
    );
    const payload = JSON.parse(readFileSync(fixturePath, 'utf8'));

    expect(payload).toHaveProperty('session_id');
    expect(Array.isArray(payload.results)).toBe(true);

    const embeddingResult = payload.results.find(
      (result) => result.task === 'image-feature-extraction'
    );
    expect(embeddingResult).toBeTruthy();
    expect(embeddingResult.detections.type).toBe('FeatureCollection');
    expect(embeddingResult.detection_count).toBeGreaterThan(0);

    const first = embeddingResult.detections.features[0];
    expect(first.geometry.type).toBe('Polygon');
    expect(typeof first.properties.patch_index).toBe('number');
    expect(typeof first.properties.embedding_norm).toBe('number');
    expect(Array.isArray(first.properties.similarities)).toBe(true);
    expect(first.properties.similarities.length).toBeGreaterThan(0);
  });
});
