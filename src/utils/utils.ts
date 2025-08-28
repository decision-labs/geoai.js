import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedModelOptions, RawImage } from "@huggingface/transformers";
import { contours } from "d3-contour";
import { polygonArea } from "d3-polygon";

type detection = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  label: string;
};

type ObjectDectection = {
  label: string;
  score: number;
  box: [number, number, number, number];
};

function removeDuplicates(detections: detection[], iouThreshold: number) {
  const filteredDetections = [];

  for (const detection of detections) {
    let isDuplicate = false;
    let duplicateIndex = -1;
    let maxIoU = 0;

    for (let i = 0; i < filteredDetections.length; i++) {
      const iou = calculateIoU(detection, filteredDetections[i]);
      if (iou > iouThreshold) {
        isDuplicate = true;
        if (iou > maxIoU) {
          maxIoU = iou;
          duplicateIndex = i;
        }
      }
    }

    if (!isDuplicate) {
      filteredDetections.push(detection);
    } else if (
      duplicateIndex !== -1 &&
      detection.score > filteredDetections[duplicateIndex].score
    ) {
      filteredDetections[duplicateIndex] = detection;
    }
  }

  return filteredDetections;
}

function calculateIoU(det1: detection, det2: detection) {
  const xOverlap = Math.max(
    0,
    Math.min(det1.x2, det2.x2) - Math.max(det1.x1, det2.x1)
  );
  const yOverlap = Math.max(
    0,
    Math.min(det1.y2, det2.y2) - Math.max(det1.y1, det2.y1)
  );
  const overlapArea = xOverlap * yOverlap;

  const area1 = (det1.x2 - det1.x1) * (det1.y2 - det1.y1);
  const area2 = (det2.x2 - det2.x1) * (det2.y2 - det2.y1);
  return overlapArea / (area1 + area2 - overlapArea);
}

export const postProcessYoloOutput = (
  model_outputs: any,
  pixel_values: { dims: number[] },
  rawImage: RawImage,
  id2label: { [key: number]: string }
) => {
  const permuted = model_outputs.output0[0].transpose(1, 0);
  const threshold = 0.5; // Confidence threshold
  const [scaledHeight, scaledWidth] = pixel_values.dims.slice(-2);
  const results = [];

  for (const [xc, yc, w, h, ...scores] of permuted.tolist()) {
    const x1 = ((xc - w / 2) / scaledWidth) * rawImage.width;
    const y1 = ((yc - h / 2) / scaledHeight) * rawImage.height;
    const x2 = ((xc + w / 2) / scaledWidth) * rawImage.width;
    const y2 = ((yc + h / 2) / scaledHeight) * rawImage.height;

    const argmax = scores.reduce(
      (maxIndex: number, val: number, idx: number, arr: number[]) =>
        val > arr[maxIndex] ? idx : maxIndex,
      0
    );
    const score = scores[argmax];
    if (score < threshold) continue;

    results.push({
      x1,
      y1,
      x2,
      y2,
      score,
      label: id2label[argmax],
      index: argmax,
    });
  }

  const iouThreshold = 0.7;
  const filteredResults = removeDuplicates(results, iouThreshold);

  const model_output: ObjectDectection[] = filteredResults.map(d => {
    return {
      score: d.score,
      box: [d.x1, d.y1, d.x2, d.y2],
      label: d.label,
    };
  });

  return model_output;
};

export const parametersChanged = (
  instance: any,
  model_id: string,
  providerParams: any,
  modelParams?: PretrainedModelOptions
): boolean => {
  // Compare model_id
  if (instance.model_id !== model_id) {
    return true;
  }

  // Compare providerParams
  const instanceProvider = instance.providerParams?.provider;
  const newProvider = providerParams?.provider;
  if (instanceProvider !== newProvider) {
    return true;
  }

  // Compare specific provider parameters
  switch (newProvider) {
    case "mapbox":
      if (
        instance.providerParams?.apiKey !== providerParams?.apiKey ||
        instance.providerParams?.style !== providerParams?.style
      ) {
        return true;
      }
      break;
    case "geobase":
      if (
        instance.providerParams?.projectRef !== providerParams?.projectRef ||
        instance.providerParams?.cogImagery !== providerParams?.cogImagery ||
        instance.providerParams?.apikey !== providerParams?.apikey
      ) {
        return true;
      }
      break;
    case "sentinel":
      if (instance.providerParams?.apiKey !== providerParams?.apiKey) {
        return true;
      }
      break;
  }

  // Compare modelParams if they exist
  if (modelParams) {
    const instanceModelParams = instance.modelParams || {};
    const newModelParams = modelParams || {};

    // Compare only the keys that exist in both objects
    const keys = Object.keys(newModelParams) as Array<
      keyof PretrainedModelOptions
    >;
    for (const key of keys) {
      if (instanceModelParams[key] !== newModelParams[key]) {
        return true;
      }
    }
  }

  return false;
};

export const detectionsToGeoJSON = (
  detections: ObjectDectection[],
  geoRawImage: GeoRawImage
): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = detections.map(detection => {
    let { xmin, ymin, xmax, ymax } = detection.box as any;

    if (Array.isArray(detection.box)) {
      [xmin, ymin, xmax, ymax] = detection.box;
    }

    const x1 = xmin;
    const y1 = ymin;
    const x2 = xmax;
    const y2 = ymax;

    let bbox = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1],
    ];
    bbox = bbox.map(point => geoRawImage.pixelToWorld(point[0], point[1]));
    return {
      type: "Feature",
      properties: {
        label: detection.label,
        score: detection.score,
      },
      geometry: {
        type: "Polygon",
        coordinates: [bbox],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
};

export const maskToGeoJSON = (
  masks: any,
  geoRawImage: GeoRawImage,
  thresholds: number[] = [128]
): GeoJSON.FeatureCollection[] => {
  const featureCollections: GeoJSON.FeatureCollection[] = [];

  masks.mask.forEach((mask: any, index: number) => {
    const contoursGen = contours()
      .size([mask.dims[3], mask.dims[2]])
      .thresholds(thresholds)
      .smooth(true);
    const data: number[] = Array.from(mask.data);
    const generatedContours = contoursGen(data);
    const polygons: [number, number][][][] = []; // collection of polygons with rings
    generatedContours.forEach(contour => {
      contour.coordinates.forEach(polygon => {
        const rings: [number, number][][] = [];
        polygon.forEach(ring => {
          if (ring.length < 3) return; // skip invalid rings
          const area = polygonArea(ring as [number, number][]);
          // map to world coordinates
          const coordinates = (ring as [number, number][]).map(coord =>
            geoRawImage.pixelToWorld(coord[0], coord[1])
          );
          if (area > 0) {
            // CCW → outer ring
            rings.unshift(coordinates);
          } else {
            // CW → hole
            rings.push(coordinates);
          }
        });

        if (rings.length > 0) {
          polygons.push(rings);
        }
      });
    });

    const maskFeature: GeoJSON.Feature = {
      type: "Feature",
      properties: {
        score: masks.scores?.[index],
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: polygons,
      },
    };

    featureCollections.push({
      type: "FeatureCollection",
      features: [maskFeature],
    });
  });

  return featureCollections;
};

/**
 * Compares two polygons to determine if they are the same
 * @param polygon1 - First polygon to compare
 * @param polygon2 - Second polygon to compare
 * @returns true if polygons are the same, false otherwise
 */
export const polygonsEqual = (
  polygon1: GeoJSON.Feature | null,
  polygon2: GeoJSON.Feature | null
): boolean => {
  if (!polygon1 || !polygon2) return false;
  if (!polygon1.geometry || !polygon2.geometry) return false;
  if (polygon1.geometry.type !== polygon2.geometry.type) return false;

  // Only handle Polygon type for now
  if (
    polygon1.geometry.type === "Polygon" &&
    polygon2.geometry.type === "Polygon"
  ) {
    const poly1 = polygon1.geometry as GeoJSON.Polygon;
    const poly2 = polygon2.geometry as GeoJSON.Polygon;
    return (
      JSON.stringify(poly1.coordinates) === JSON.stringify(poly2.coordinates)
    );
  }

  return false;
};
