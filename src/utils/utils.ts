import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions, RawImage } from "@huggingface/transformers";
const cv = require("@techstark/opencv-js");

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
  // provider: string,
  providerParams: any,
  modelParams?: PretrainedOptions
): boolean => {
  return (
    instance.model_id !== model_id ||
    // instance.provider !== provider ||
    JSON.stringify(instance.providerParams) !==
      JSON.stringify(providerParams) ||
    JSON.stringify(instance.modelParams) !== JSON.stringify(modelParams)
  );
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

const getEdges = (binaryMask: number[][]) => {
  const rows = binaryMask.length;
  const cols = binaryMask[0].length;
  const edges = Array.from({ length: rows }, () => Array(cols).fill(0));

  const isEdge = (i: number, j: number) => {
    if (binaryMask[i][j] === 0) return false;
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      const ni = i + dx,
        nj = j + dy;
      if (
        ni < 0 ||
        ni >= rows ||
        nj < 0 ||
        nj >= cols ||
        binaryMask[ni][nj] === 0
      ) {
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      edges[i][j] = isEdge(i, j) ? 1 : 0;
    }
  }
  return edges;
};

export const getPolygonFromMask = (
  mask: number[][],
  geoRawImage: GeoRawImage
) => {
  const edges = getEdges(mask);
  const height = edges.length;
  const width = edges[0].length;

  const isValid = (y: number, x: number) =>
    y >= 0 && y < height && x >= 0 && x < width;

  const directions = [
    [0, 1],
    [1, 1],
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
  ];

  const polygon: [number, number][] = [];
  let start: [number, number] | null = null;

  // Find the first edge pixel
  outerLoop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y][x] === 1) {
        start = [y, x];
        break outerLoop;
      }
    }
  }

  if (!start) return polygon; // No edges found

  let current = start;
  let prevDirection = 0;

  do {
    const [cy, cx] = current;
    polygon.push(geoRawImage.pixelToWorld(cx, cy));

    let found = false;
    for (let i = 0; i < directions.length; i++) {
      const dir = (prevDirection + i) % directions.length;
      const [dy, dx] = directions[dir];
      const ny = cy + dy,
        nx = cx + dx;

      if (isValid(ny, nx) && edges[ny][nx] === 1) {
        current = [ny, nx];
        prevDirection = (dir + directions.length - 2) % directions.length;
        found = true;
        break;
      }
    }

    if (!found) break; // Stuck, break loop
  } while (current[0] !== start[0] || current[1] !== start[1]);

  if (polygon.length > 0) {
    polygon.push(polygon[0]); // Close the polygon
  }

  return polygon;
};

export const maskToGeoJSON = (
  masks: any,
  geoRawImage: GeoRawImage,
  topN: number = 1
): GeoJSON.FeatureCollection => {
  const { mask, scores } = masks;
  const numMasks = scores.length;
  const features: GeoJSON.Feature[] = [];

  for (let index = 0; index < numMasks; index++) {
    const height = mask[0].dims[2];
    const width = mask[0].dims[3];
    const binaryMask = Array.from({ length: height }, () =>
      Array(width).fill(0)
    );

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        if (mask[0].data[index * height * width + y * width + x] === 1) {
          binaryMask[y][x] = 1;
        }
      }
    }

    //save binary mask as a png using RawImage
    // const maskImage = {
    //   data: new Uint8ClampedArray(width * height * 4),
    //   width: width,
    //   height: height,
    // };
    // const edgeMask = getEdges(binaryMask);
    // for (let y = 0; y < height; ++y) {
    //   for (let x = 0; x < width; ++x) {
    //     const value = edgeMask[y][x] === 1 ? 255 : 0;
    //     maskImage.data[4 * (y * width + x) + 0] = value;
    //     maskImage.data[4 * (y * width + x) + 1] = value;
    //     maskImage.data[4 * (y * width + x) + 2] = value;
    //     maskImage.data[4 * (y * width + x) + 3] = 255;
    //   }
    // }

    // const rawImage = new RawImage(maskImage.data, width, height, 4);
    // rawImage.save(`mask_${index}-${scores[index]}.png`);

    features.push({
      type: "Feature",
      properties: {
        score: scores[index],
      },
      geometry: {
        type: "Polygon",
        coordinates: [getPolygonFromMask(binaryMask, geoRawImage)],
      },
    });
  }

  // Sort features by score in descending order and take top N
  const sortedFeatures = features
    .sort((a, b) => {
      if (!a.properties?.score || !b.properties?.score) return 0;
      return b.properties.score - a.properties.score;
    })
    .slice(0, topN);

  return {
    type: "FeatureCollection",
    features: sortedFeatures,
  };
};

export const refineMasks = (
  binaryMasks: RawImage[],
  geoRawImage: GeoRawImage,
  classes: string[] = []
): GeoJSON.FeatureCollection[] => {
  const maskGeojson: GeoJSON.FeatureCollection[] = [];
  binaryMasks.forEach((mask, index) => {
    const maskDataArray = Array.from(mask.data);

    const maskMat = cv.matFromArray(
      mask.height,
      mask.width,
      cv.CV_8UC3,
      maskDataArray
    );

    const gray = new cv.Mat();
    cv.cvtColor(maskMat, gray, cv.COLOR_RGB2GRAY);
    let thresh = new cv.Mat();
    cv.threshold(gray, thresh, 128, 255, cv.THRESH_BINARY);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      thresh,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const refinedMask = cv.Mat.zeros(mask.height, mask.width, cv.CV_8UC1);

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const epsilon = 0.01 * cv.arcLength(contour, true); // Adjust epsilon to be a smaller fraction of the contour perimeter
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, epsilon, true);
      const approxVector = new cv.MatVector();
      approxVector.push_back(approx);

      cv.drawContours(
        refinedMask,
        approxVector,
        -1,
        new cv.Scalar(255),
        cv.FILLED
      );
      approx.delete();
      approxVector.delete();
    }

    // Step 2: Find contours and filter based on area
    const cleanedMaskContours = new cv.MatVector();
    const cleanedMaskHierarchy = new cv.Mat();
    cv.findContours(
      refinedMask,
      cleanedMaskContours,
      cleanedMaskHierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const finalRefinedMask = cv.Mat.zeros(mask.height, mask.width, cv.CV_8UC1);
    const minArea = 20; // Adjust threshold based on noise size

    for (let i = 0; i < cleanedMaskContours.size(); i++) {
      const contour = cleanedMaskContours.get(i);
      const area = cv.contourArea(contour);
      if (area > minArea) {
        const contourVector = new cv.MatVector();
        contourVector.push_back(contour);
        cv.drawContours(
          finalRefinedMask,
          contourVector,
          -1,
          new cv.Scalar(255),
          cv.FILLED
        );
        contourVector.delete();
      }
      contour.delete();
    }

    // Step 3: Apply Morphological Closing (Fill gaps)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(
      finalRefinedMask,
      finalRefinedMask,
      cv.MORPH_CLOSE,
      kernel,
      new cv.Point(-1, -1),
      2
    );

    //resize the mask to the original image size
    const resizedMask = new cv.Mat();
    cv.resize(
      finalRefinedMask,
      resizedMask,
      new cv.Size(geoRawImage.width, geoRawImage.height),
      0,
      0,
      cv.INTER_NEAREST
    );

    //add padding to the mask of 1 pixel as black border
    const paddedMask = new cv.Mat(
      geoRawImage.height + 2,
      geoRawImage.width + 2,
      cv.CV_8UC1,
      new cv.Scalar(0, 0, 0, 0)
    );
    resizedMask.copyTo(
      paddedMask.roi(new cv.Rect(1, 1, geoRawImage.width, geoRawImage.height))
    );

    //get all contours for the resized mask

    const _contours = new cv.MatVector();
    const _hierarchy = new cv.Mat();
    cv.findContours(
      paddedMask,
      _contours,
      _hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    const edges = [];
    // Create a new mask for each contour
    for (let i = 0; i < _contours.size(); i++) {
      const contour = _contours.get(i);
      const contourMask = cv.Mat.zeros(
        geoRawImage.height + 2,
        geoRawImage.width + 2,
        cv.CV_8UC1
      );
      const contourVector = new cv.MatVector();
      contourVector.push_back(contour);
      cv.drawContours(
        contourMask,
        contourVector,
        -1,
        new cv.Scalar(255),
        cv.FILLED
      );

      //edge detection
      const edge = new cv.Mat();
      cv.Canny(contourMask, edge, 100, 200);

      let kernel = cv.Mat.ones(3, 3, cv.CV_8U); // 3x3 kernel
      let closed = new cv.Mat();

      cv.morphologyEx(edge, closed, cv.MORPH_CLOSE, kernel);

      edges.push(closed);
      contourVector.delete();
    }

    const geojsonPolygons = edges.map(edge => {
      const edgeData = new Uint8Array(edge.data);
      const edgeData2D = [];
      for (let i = 0; i < edge.rows; i++) {
        const row = [];
        for (let j = 0; j < edge.cols; j++) {
          const value = edgeData[i * edge.cols + j] === 255 ? 1 : 0;
          row.push(value);
        }
        edgeData2D.push(row);
      }

      const ed = getPolygonFromMask(edgeData2D, geoRawImage);
      return ed;
    });

    const features: GeoJSON.Feature[] = geojsonPolygons.map(polygon => {
      polygon.push(polygon[0]);
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [polygon],
        },
        properties: {
          class: classes[index],
        },
      };
    });

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    maskGeojson.push(featureCollection);

    // Clean up
    maskMat.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    refinedMask.delete();
    cleanedMaskContours.delete();
    cleanedMaskHierarchy.delete();
    finalRefinedMask.delete();
    kernel.delete();
  });

  return maskGeojson;
};
