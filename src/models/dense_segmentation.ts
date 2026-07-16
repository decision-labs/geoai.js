import { BaseModel } from '@/models/base_model';
import {
  ImageProcessor,
  PreTrainedModel,
  PretrainedModelOptions,
  Tensor,
} from '@huggingface/transformers';
import { maskToGeoJSON } from '@/utils/utils';
import { ProviderParams } from '@/geoai';
import { GeoRawImage } from '@/types/images/GeoRawImage';
import * as ort from 'onnxruntime-web';
import { InferenceParams, ObjectDetectionResults } from '@/core/types';

/**
 * Base for dense (per-pixel) soft-mask segmentation models.
 *
 * Expects an ONNX graph that consumes an ImageNet-normalized NCHW image
 * resized to tileSize×tileSize and emits a fixed probability map
 * (1, 1, tileSize, tileSize). Subclasses configure I/O tensor names and
 * optional overlapped tiling.
 */
export abstract class BaseDenseSegmentationModel extends BaseModel {
  protected model: ort.InferenceSession | undefined;
  protected processor: ImageProcessor | undefined;

  /** ONNX input feed name (e.g. "image"). */
  protected abstract readonly inputName: string;
  /** Soft-probability output tensor name (e.g. "building_prob"). */
  protected abstract readonly outputName: string;
  /** Tile edge length in pixels. */
  protected readonly tileSize: number = 1024;
  /** Overlap between adjacent tiles for feather blending. */
  protected readonly tileOverlap: number = 64;
  /** Default probability threshold for binarization. */
  protected readonly defaultThreshold: number = 0.5;

  protected constructor(
    model_id: string,
    providerParams: ProviderParams,
    modelParams?: PretrainedModelOptions
  ) {
    super(model_id, providerParams, modelParams);
  }

  protected async initializeModel(): Promise<void> {
    if (this.model) return;
    this.processor = await ImageProcessor.from_pretrained(this.model_id);
    const pretrainedModel = await PreTrainedModel.from_pretrained(
      this.model_id,
      this.modelParams
    );
    this.model = pretrainedModel.sessions.model;
  }

  protected resolveProbabilityOutput(outputs: Record<string, any>): {
    type: string;
    dims: number[];
    size: number;
    data: Float32Array;
  } {
    const tensor = outputs[this.outputName];
    if (!tensor) {
      throw new Error(
        `Model output "${this.outputName}" not found; got [${Object.keys(outputs).join(', ')}]`
      );
    }

    const dims = tensor.dims as number[];

    // ORT Tensor exposes .data (backed by cpuData when on CPU).
    const raw = tensor.data ?? tensor.cpuData;

    return {
      type: tensor.type,
      dims,
      size: tensor.size,
      data: raw,
    };
  }

  protected featherWeight(size: number, overlap: number): Float32Array {
    const ramp = new Float32Array(size);
    ramp.fill(1);
    if (overlap > 0) {
      for (let i = 0; i < overlap; i++) {
        const t = i / (overlap - 1 || 1);
        ramp[i] = t;
        ramp[size - 1 - i] = t;
      }
    }
    const weights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        weights[y * size + x] = ramp[y] * ramp[x];
      }
    }
    return weights;
  }

  protected async runTile(
    tileImage: GeoRawImage
  ): Promise<{ data: Float32Array; height: number; width: number }> {
    if (!this.processor || !this.model) {
      throw new Error('Model or processor not initialized');
    }

    const inputs = await this.processor(tileImage);
    const pixelValues = inputs.pixel_values;
    // Copy into a contiguous Float32Array — avoids SharedArrayBuffer / view
    // edge cases that can abort ORT WASM in browser workers.
    const dataCopy =
      pixelValues.data instanceof Float32Array
        ? new Float32Array(pixelValues.data)
        : Float32Array.from(pixelValues.data as ArrayLike<number>);
    const feed = new Tensor('float32', dataCopy, pixelValues.dims);

    let outputs: any;
    try {
      outputs = await this.model.run({
        [this.inputName]: feed as any,
      });
    } catch (err) {
      const detail =
        err instanceof Error
          ? err.message
          : typeof err === 'number'
            ? `ONNX Runtime abort (${err}) — often WASM out-of-memory for this ${this.tileSize}px fp32 model. Try WebGPU (Chrome/Edge) or a smaller AOI.`
            : String(err);
      throw new Error(`Dense segmentation tile inference failed: ${detail}`);
    }

    const { data } = this.resolveProbabilityOutput(outputs);

    return {
      data,
      height: this.tileSize,
      width: this.tileSize,
    };
  }

  /**
   * Overlapped tiled inference with feather blending, matching the
   * ChangeStar pipeline (tile_size / overlap / threshold).
   */
  protected async inferDenseMask(
    geoRawImage: GeoRawImage,
    threshold: number
  ): Promise<GeoJSON.FeatureCollection> {
    const { height, width } = geoRawImage;
    const tileSize = this.tileSize;
    const overlap = Math.min(this.tileOverlap, tileSize - 1);
    const stride = tileSize - overlap;
    const feather = this.featherWeight(tileSize, overlap);

    const accum = new Float32Array(height * width);
    const weightSum = new Float32Array(height * width);

    for (let rowOff = 0; rowOff < height; rowOff += stride) {
      for (let colOff = 0; colOff < width; colOff += stride) {
        const winH = Math.min(tileSize, height - rowOff);
        const winW = Math.min(tileSize, width - colOff);

        // Crop inclusive bottom-right like GeoRawImage.toPatches
        const croppedRaw = await geoRawImage.crop([
          colOff,
          rowOff,
          colOff + winW - 1,
          rowOff + winH - 1,
        ]);

        const padH = tileSize - winH;
        const padW = tileSize - winW;
        const paddedRaw =
          padH > 0 || padW > 0
            ? await croppedRaw.pad([0, padW, 0, padH])
            : croppedRaw;

        const tileImage = GeoRawImage.fromRawImage(
          paddedRaw,
          geoRawImage.getBounds(),
          geoRawImage.getCRS()
        );

        const { data: prob } = await this.runTile(tileImage);

        for (let y = 0; y < winH; y++) {
          for (let x = 0; x < winW; x++) {
            const srcIdx = y * tileSize + x;
            const dstIdx = (rowOff + y) * width + (colOff + x);
            const w = feather[y * tileSize + x];
            accum[dstIdx] += prob[srcIdx] * w;
            weightSum[dstIdx] += w;
          }
        }
      }
    }

    const binary = new Uint8Array(height * width);
    for (let i = 0; i < height * width; i++) {
      const w = weightSum[i] === 0 ? 1 : weightSum[i];
      binary[i] = accum[i] / w > threshold ? 255 : 0;
    }

    // Downsample before contouring so browser workers can postMessage results
    // (full-resolution contours easily produce 10k+ vertex polygons).
    const scale = height > 512 || width > 512 ? 2 : 1;
    const contourH = Math.max(1, Math.floor(height / scale));
    const contourW = Math.max(1, Math.floor(width / scale));
    let contourBinary = binary;
    let contourImage = geoRawImage;
    if (scale > 1) {
      contourBinary = new Uint8Array(contourH * contourW);
      for (let y = 0; y < contourH; y++) {
        for (let x = 0; x < contourW; x++) {
          contourBinary[y * contourW + x] =
            binary[y * scale * width + x * scale];
        }
      }
      contourImage = new GeoRawImage(
        contourBinary,
        contourW,
        contourH,
        1,
        geoRawImage.getBounds(),
        geoRawImage.getCRS()
      );
    }

    const maskTensor = new Tensor('uint8', contourBinary, [
      1,
      1,
      contourH,
      contourW,
    ]);
    const masksToFC = maskToGeoJSON({ mask: [maskTensor] }, contourImage);
    const features: GeoJSON.Feature[] = [];
    masksToFC.forEach(fc => {
      fc.features.forEach(feature => {
        feature.properties = {
          ...(feature.properties || {}),
          class: 'building',
        };
        features.push(feature);
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async inference(params: InferenceParams): Promise<ObjectDetectionResults> {
    const {
      inputs: { polygon },
      postProcessingParams: { confidenceThreshold } = {},
      mapSourceParams,
    } = params;

    if (!polygon) {
      throw new Error('Polygon input is required for dense segmentation');
    }
    if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
      throw new Error('Input must be a valid GeoJSON Polygon feature');
    }

    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.model || !this.processor || !this.dataProvider) {
      throw new Error('Model or data provider not initialized');
    }

    const geoRawImage = (await this.polygonToImage(
      polygon,
      mapSourceParams?.zoomLevel,
      mapSourceParams?.bands,
      mapSourceParams?.expression
    )) as GeoRawImage;

    const threshold =
      typeof confidenceThreshold === 'number'
        ? confidenceThreshold
        : this.defaultThreshold;

    const taskName = this.model_id.split('/').pop() ?? 'dense-segmentation';
    const inferenceStartTime = performance.now();
    console.log(`[${taskName}] starting dense segmentation inference...`);

    const detections = await this.inferDenseMask(geoRawImage, threshold);

    const inferenceEndTime = performance.now();
    console.log(
      `[${taskName}] inference completed. Time taken: ${(inferenceEndTime - inferenceStartTime).toFixed(2)}ms`
    );

    return {
      detections,
      geoRawImage,
    };
  }
}
