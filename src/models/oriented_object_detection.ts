import { RawImage } from "@huggingface/transformers";
import { parametersChanged } from "@/utils/utils";

import { ProviderParams } from "@/geobase-ai";
import { GeoRawImage } from "@/types/images/GeoRawImage";
import { PretrainedOptions } from "@huggingface/transformers";
import * as ort from "onnxruntime-web";
import { iouPoly } from "@/utils/gghl/polyiou";
import { BaseModel } from "./base_model"; // <-- import BaseModel
import { loadOnnxModel } from "./model_utils";
import { InferenceParams, ObjectDetectionResults } from "@/core/types";

interface ConvertPredParams {
  pred_bbox: number[][];
  org_img_shape: [number, number];
  valid_scale: [number, number];
  conf_thresh: number;
}

export interface NMSOptions {
  conf_thres?: number;
  iou_thres?: number;
  merge?: boolean;
  classes?: number[];
  multi_label?: boolean;
  agnostic?: boolean;
  without_iouthres?: boolean;
}

export class OrientedObjectDetection extends BaseModel {
  protected static instance: OrientedObjectDetection | null = null;
  protected model: ort.InferenceSession | undefined;
  protected initialized: boolean = false;
  protected classes: string[] = [
    "plane",
    "baseball-diamond",
    "bridge",
    "ground-track-field",
    "small-vehicle",
    "large-vehicle",
    "ship",
    "tennis-court",
    "basketball-court",
    "storage-tank",
    "soccer-ball-field",
    "roundabout",
    "harbor",
    "swimming-pool",
    "helicopter",
  ];

  protected constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ) {
    super(model_id, providerParams, modelParams);
  }

  static async getInstance(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedOptions
  ): Promise<{ instance: OrientedObjectDetection }> {
    if (
      !OrientedObjectDetection.instance ||
      parametersChanged(
        OrientedObjectDetection.instance,
        model_id,
        providerParams,
        modelParams
      )
    ) {
      OrientedObjectDetection.instance = new OrientedObjectDetection(
        model_id,
        providerParams
      );
      await OrientedObjectDetection.instance.initialize();
    }
    return { instance: OrientedObjectDetection.instance };
  }

  protected async preProcessor(image: GeoRawImage): Promise<any> {
    // Create RawImage instance and resize it
    let rawImage = new RawImage(
      image.data,
      image.height,
      image.width,
      image.channels
    );

    // If image has 4 channels, convert it to 3 channels (e.g., remove alpha channel)
    if (image.channels > 3) {
      const newData = new Uint8Array(image.width * image.height * 3);
      for (let i = 0, j = 0; i < image.data.length; i += 4, j += 3) {
        newData[j] = image.data[i]; // R
        newData[j + 1] = image.data[i + 1]; // G
        newData[j + 2] = image.data[i + 2]; // B
      }
      rawImage = new RawImage(newData, image.height, image.width, 3);
    }
    // Convert RawImage to a tensor in CHW format
    const tensor = rawImage.toTensor("CHW"); // Transpose to CHW format

    // Convert tensor data to Float32Array
    const floatData = new Float32Array(tensor.data.length);
    for (let i = 0; i < tensor.data.length; i++) {
      floatData[i] = tensor.data[i] / 255.0; // Normalize to [0, 1] if needed
    }

    // Create the ONNX Runtime tensor
    const inputs = {
      input: new ort.Tensor(floatData, [
        1,
        tensor.dims[0],
        tensor.dims[1],
        tensor.dims[2],
      ]),
    };

    return inputs;
  }

  protected async initializeModel(): Promise<void> {
    // Only load the model if not already loaded
    if (this.model) return;
    this.model = await loadOnnxModel(this.model_id);
  }

  /**
   * Performs object detection on a given geographic polygon.
   * @param polygon - A GeoJSON Feature representing the area for detection
   * @param options - Optional NMS (Non-Maximum Suppression) configuration options
   * @param {NMSOptions} [options={}] - Configuration options for NMS post-processing
   * @returns {Promise<ObjectDetectionResults>} A promise that resolves to the detection results, including the detections array and raw image
   * @throws {Error} If the data provider or model is not properly initialized
   */
  async inference(params: InferenceParams): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
      postProcessingParams,
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error("Polygon input is required for segmentation");
    }

    if (!polygon.geometry || polygon.geometry.type !== "Polygon") {
      throw new Error("Input must be a valid GeoJSON Polygon feature");
    }
    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initialize();
    }

    // Double-check data provider after initialization
    if (!this.dataProvider) {
      throw new Error("Data provider not initialized");
    }

    const geoRawImage = await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression,
      true
    );

    const inputs = await this.preProcessor(geoRawImage);
    let outputs;
    try {
      if (!this.model) {
        throw new Error("Model or processor not initialized");
      }
      outputs = await this.model.run(inputs);
    } catch (error) {
      console.debug("error", error);
      throw error;
    }

    outputs = await this.postProcessor(
      outputs,
      geoRawImage,
      postProcessingParams as NMSOptions
    );

    return {
      detections: outputs,
      geoRawImage,
    };
  }

  protected convertPred({
    pred_bbox,
    org_img_shape,
    valid_scale,
    conf_thresh,
  }: ConvertPredParams): number[][] {
    const [org_w, org_h] = org_img_shape;

    // Extract and convert xywh to xyxy
    const xywh = pred_bbox.map(bbox => bbox.slice(0, 4));
    const xyxy = xywh.map(box => {
      const [x, y, w, h] = box;
      return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    });

    // Extract other components
    const pred_s = pred_bbox.map(bbox => bbox.slice(4, 8));
    const pred_r = pred_bbox.map(bbox => bbox[8]);
    const pred_conf = pred_bbox.map(bbox => bbox[13]);
    const pred_prob = pred_bbox.map(bbox => bbox.slice(14));

    // Handle rotation
    const zero = pred_s.map(() => [0, 0, 0, 0]);
    const pred_s_adjusted = pred_s.map((s, i) => {
      return pred_r[i] > 0.9 ? zero[i] : s;
    });

    // Clip coordinates
    const clipped_xyxy = xyxy.map(box => {
      return [
        Math.max(0, box[0]),
        Math.max(0, box[1]),
        Math.min(org_w - 1, box[2]),
        Math.min(org_h - 1, box[3]),
      ];
    });

    // Find invalid boxes
    const invalid_mask = clipped_xyxy.map(
      box => box[0] > box[2] || box[1] > box[3]
    );

    // Zero out invalid boxes
    const final_xyxy = clipped_xyxy.map((box, i) => {
      return invalid_mask[i] ? [0, 0, 0, 0] : box;
    });
    const final_pred_s = pred_s_adjusted.map((s, i) => {
      return invalid_mask[i] ? [0, 0, 0, 0] : s;
    });

    // Calculate scale and apply scale mask
    const bboxes_scale = final_xyxy.map(box =>
      Math.sqrt((box[2] - box[0]) * (box[3] - box[1]))
    );
    const scale_mask = bboxes_scale.map(
      scale => valid_scale[0] < scale && scale < valid_scale[1]
    );

    // Calculate class scores
    const classes = pred_prob.map(prob => prob.indexOf(Math.max(...prob)));
    const scores = pred_conf.map((conf, i) => conf * pred_prob[i][classes[i]]);
    const score_mask = scores.map(score => score > conf_thresh);

    // Combine masks
    const mask = scale_mask.map((scale, i) => scale && score_mask[i]);

    // Apply masks to filter arrays
    const filtered_xyxy = final_xyxy.filter((_, i) => mask[i]);
    const filtered_pred_s = final_pred_s.filter((_, i) => mask[i]);
    const filtered_pred_conf = pred_conf.filter((_, i) => mask[i]);
    const filtered_pred_prob = pred_prob.filter((_, i) => mask[i]);

    // Calculate 4 corner points
    const coor4points = filtered_pred_s.map((s, i) => {
      const [x1, y1, x2, y2] = filtered_xyxy[i];
      const width = x2 - x1;
      const height = y2 - y1;

      return [
        s[0] * width + x1, // x1
        y1, // y1
        x2, // x2
        s[1] * height + y1, // y2
        x2 - s[2] * width, // x3
        y2, // y3
        x1, // x4
        y2 - s[3] * height, // y4
      ];
    });

    // Combine with confidence and class probabilities
    const bboxes = coor4points.map((points, i) => {
      return [...points, filtered_pred_conf[i], ...filtered_pred_prob[i]];
    });

    return bboxes;
  }

  /**
   * Performs Rotate-Non-Maximum Suppression (RNMS) on inference results.
   * @param prediction Array of predictions with shape (batch_size, num_boxes, [xywh, score, num_classes, num_angles]).
   * @param conf_thres Confidence threshold.
   * @param iou_thres IoU threshold.
   * @param classes Array of class indices to filter by.
   * @param without_iouthres Whether to skip IoU thresholding.
   * @returns Array of filtered boxes after NMS.
   */
  protected nonMaxSuppression4Points(
    prediction: number[][][],
    {
      conf_thres = 0.4,
      iou_thres = 0.45,
      classes = undefined,
      multi_label = true,
      without_iouthres = false,
    }: NMSOptions = {}
  ): number[][][] {
    const batchSize = prediction.length;
    const numClasses = prediction[0][0].length - 9;

    // Initialize output array
    const output: number[][][] = Array.from({ length: batchSize }, () => []);

    // Iterate over each image in the batch
    for (let xi = 0; xi < batchSize; xi++) {
      const x = prediction[xi];

      // Filter out boxes with confidence below the threshold
      const filteredBoxes = x.filter(box => box[8] > conf_thres);

      if (filteredBoxes.length === 0) {
        continue; // Skip if no boxes remain
      }

      // Compute confidence scores
      const boxesWithScores: number[][] = [];
      if (multi_label && numClasses > 1) {
        filteredBoxes.forEach(box => {
          box.slice(9).forEach((score, j) => {
            const confScore = score * box[8];
            if (confScore > conf_thres) {
              boxesWithScores.push([
                ...box.slice(0, 8), // xywhθ
                confScore, // Confidence score
                j, // Class index
              ]);
            }
          });
        });
      } else {
        filteredBoxes.forEach(box => {
          const maxConf = Math.max(
            ...box.slice(9).map(score => score * box[8])
          );
          const classIndex = box
            .slice(9)
            .map(score => score * box[8])
            .indexOf(maxConf);
          if (maxConf > conf_thres) {
            boxesWithScores.push([
              ...box.slice(0, 8), // xywhθ
              maxConf, // Confidence score
              classIndex, // Class index
            ]);
          }
        });
      }

      if (without_iouthres) {
        output[xi] = boxesWithScores;
        continue;
      }

      // Filter by class if specified
      const filteredByClass = classes
        ? boxesWithScores.filter(box => classes.includes(box[box.length - 1]))
        : boxesWithScores;

      if (filteredByClass.length === 0) {
        continue; // Skip if no boxes remain after class filtering
      }

      // Sort boxes by confidence score
      filteredByClass.sort((a, b) => b[8] - a[8]);

      // Perform polygonal NMS
      const boxes4Points = filteredByClass.map(box => box.slice(0, 8));
      const scores = filteredByClass.map(box => box[8]);
      const keepIndices = this.pyCpuNmsPolyFast(
        boxes4Points,
        scores,
        iou_thres
      );

      // Limit the number of detections
      const maxDet = 500;
      const finalIndices = keepIndices.slice(0, maxDet);

      output[xi] = finalIndices.map(i => filteredByClass[i]);
    }

    return output;
  }

  /**
   * Polygonal NMS implementation.
   * @param dets Array of polygons with shape (num_detections, [poly]).
   * @param scores Array of confidence scores with shape (num_detections, 1).
   * @param thresh IoU threshold.
   * @returns Array of indices to keep after NMS.
   */
  protected pyCpuNmsPolyFast(
    dets: number[][],
    scores: number[],
    thresh: number
  ): number[] {
    const obbs = dets.map(det => det.slice(0, 8)); // Extract polygons
    const x1 = obbs.map(obb => Math.min(...obb.filter((_, i) => i % 2 === 0)));
    const y1 = obbs.map(obb => Math.min(...obb.filter((_, i) => i % 2 === 1)));
    const x2 = obbs.map(obb => Math.max(...obb.filter((_, i) => i % 2 === 0)));
    const y2 = obbs.map(obb => Math.max(...obb.filter((_, i) => i % 2 === 1)));
    const areas = x1.map((_, i) => (x2[i] - x1[i] + 1) * (y2[i] - y1[i] + 1));

    const polys = dets.map(det => [
      det[0],
      det[1],
      det[2],
      det[3],
      det[4],
      det[5],
      det[6],
      det[7],
    ]);

    let order = scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);

    const keep: number[] = [];
    while (order.length > 0) {
      const i = order.shift()!; // Remove the first element
      keep.push(i);

      const xx1 = x1.map(val => Math.max(x1[i], val));
      const yy1 = y1.map(val => Math.max(y1[i], val));
      const xx2 = x2.map(val => Math.min(x2[i], val));
      const yy2 = y2.map(val => Math.min(y2[i], val));

      const w = xx2.map((val, idx) => Math.max(0, val - xx1[idx]));
      const h = yy2.map((val, idx) => Math.max(0, val - yy1[idx]));
      const hbbInter = w.map((val, idx) => val * h[idx]);
      const hbbOvr = hbbInter.map(
        (val, idx) => val / (areas[i] + areas[idx] - val)
      );

      // keep only overlapping indexes
      const h_inds = hbbOvr
        .map((val, idx) => (val > 0 ? idx : -1))
        .filter(idx => idx !== -1 && idx !== i); // exclude self

      const tmp_order = order.filter(j => h_inds.includes(j));

      // Recompute IOU for overlapping polygons
      for (let j = 0; j < tmp_order.length; j++) {
        const iou = iouPoly(polys[i], polys[tmp_order[j]]);
        hbbOvr[tmp_order[j]] = iou;
      }

      const inds = order.filter(j => hbbOvr[j] < thresh);
      order = inds;
    }

    return keep;
  }

  protected async postProcessor(
    outputs: any,
    geoRawImage: GeoRawImage,
    options: NMSOptions = {}
  ): Promise<any> {
    //convert tensor to array
    const dimsensions = outputs.output.dims;
    // convert 1 d array to 2d array
    const data = outputs.output.data;
    const pred_bbox = [];
    for (let i = 0; i < dimsensions[0]; i++) {
      pred_bbox.push(data.slice(i * dimsensions[1], (i + 1) * dimsensions[1]));
    }

    const valid_scale: [number, number] = [0, Infinity];
    let predbboxes = this.convertPred({
      pred_bbox,
      org_img_shape: [geoRawImage.width, geoRawImage.height],
      valid_scale,
      conf_thresh: options.conf_thres || 0.5,
    });

    if (predbboxes.length === 0) {
      return {
        type: "FeatureCollection",
        features: [],
      };
    }

    predbboxes = this.nonMaxSuppression4Points([predbboxes], options)[0];

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    for (const bbox of predbboxes) {
      const [x1, y1, x2, y2, x3, y3, x4, y4, score, class_ind] = bbox;
      const class_name = this.classes[class_ind];
      const points = [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4],
        [x1, y1],
      ].map(point => {
        point = point.map(Math.round);
        return geoRawImage.pixelToWorld(point[0], point[1]);
      });

      const feature: GeoJSON.Feature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [points],
        },
        properties: {
          score,
          class_name,
        },
      };
      featureCollection.features.push(feature);
    }

    return featureCollection;
  }
}
