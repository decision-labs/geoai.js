import { RawImage } from "@huggingface/transformers";

export interface Bounds {
  north: number; // max latitude
  south: number; // min latitude
  east: number; // max longitude
  west: number; // min longitude
}

interface Transform {
  // Affine transformation matrix components
  a: number; // x scale
  b: number; // y skew
  c: number; // x offset
  d: number; // x skew
  e: number; // y scale
  f: number; // y offset
}

export class GeoRawImage extends RawImage {
  private bounds: Bounds;
  private transform: Transform;
  private crs: string;

  constructor(
    data: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    channels: 1 | 2 | 3 | 4,
    bounds: Bounds,
    crs: string = "EPSG:4326" // Default to WGS84
  ) {
    super(data, width, height, channels);
    this.bounds = bounds;
    this.transform = {
      a: (bounds.east - bounds.west) / width,
      b: 0,
      c: bounds.west,
      d: 0,
      e: -(bounds.north - bounds.south) / height,
      f: bounds.north,
    };
    this.crs = crs;
  }

  /**
   * Convert the image into patches.
   */
  async toPatches(
    patch_height: number,
    patch_width: number,
    { padding = true } = {}
  ): Promise<GeoRawImage[][]> {
    if (this.channels === 2) {
      throw new Error(
        "Splitting into patches is not supported for 2-channel images."
      );
    }

    const { height, width } = this;

    const remainder_h = height % patch_height;
    const remainder_w = width % patch_width;
    const pad_h = remainder_h === 0 ? 0 : patch_height - remainder_h;
    const pad_w = remainder_w === 0 ? 0 : patch_width - remainder_w;

    let image = this as GeoRawImage;
    if (padding && (pad_h > 0 || pad_w > 0)) {
      // We only pad if padding is enabled AND if there are remainders
      image = (await image.pad([0, pad_w, 0, pad_h])) as GeoRawImage;
    }

    // Since we may have padded the image, we use the updated width and height
    const padded_height = image.height;
    const padded_width = image.width;

    const patches: GeoRawImage[][] = [];
    for (
      let h_pixel_start = 0;
      h_pixel_start < padded_height;
      h_pixel_start += patch_height
    ) {
      const rowPatches: GeoRawImage[] = [];
      for (
        let w_pixel_start = 0;
        w_pixel_start < padded_width;
        w_pixel_start += patch_width
      ) {
        // Get the pixel coordinates of the current patch
        const h_pixel_end =
          Math.min(h_pixel_start + patch_height, padded_height) - 1;
        const w_pixel_end =
          Math.min(w_pixel_start + patch_width, padded_width) - 1;

        // Crop the underlying RawImage data
        const rawPatch = await image.crop([
          w_pixel_start,
          h_pixel_start,
          w_pixel_end,
          h_pixel_end,
        ]);

        // Convert pixel coordinates of the patch's top-left and bottom-right corners
        // to world coordinates to define the new bounds.
        const [west, north] = this.pixelToWorld(w_pixel_start, h_pixel_start);
        const [east, south] = this.pixelToWorld(
          w_pixel_end + 1,
          h_pixel_end + 1
        );

        const patchBounds: Bounds = {
          north: north,
          south: south,
          east: east,
          west: west,
        };

        // Create a new GeoRawImage instance for the patch
        const geoPatch = GeoRawImage.fromRawImage(
          rawPatch,
          patchBounds,
          this.crs
        );

        rowPatches.push(geoPatch);
      }
      patches.push(rowPatches);
    }
    return patches;
  }

  /**
   * Static function to join a 2D array of RawImage patches into a single GeoRawImage.
   * This function assumes the patches are contiguous and form a complete grid.
   * @param patches A 2D array of RawImage objects to be joined.
   * @param bounds The bounds of the final, merged image.
   * @param crs The Coordinate Reference System of the final, merged image.
   * @returns A promise that resolves to a single GeoRawImage containing the joined data.
   */
  static fromPatches(
    patches: RawImage[][],
    bounds: Bounds,
    crs: string
  ): GeoRawImage {
    // Validate input patches
    if (!patches || patches.length === 0 || patches[0].length === 0) {
      throw new Error("Input patches must be a non-empty 2D array.");
    }

    const firstPatch = patches[0][0];
    const channels = firstPatch.channels;

    // Check for consistent channels across all patches
    patches.forEach((row, i) => {
      row.forEach((patch, j) => {
        if (patch.channels !== channels) {
          if (patch.channels === 4 && channels === 3) {
            patch = patch.rgb();
          } else {
            throw new Error(
              `All patches must have the same number of channels. Row: ${i}, Column: ${j}`
            );
          }
        }
      });
    });

    // Calculate total dimensions of the new image
    let totalWidth = 0;
    let totalHeight = 0;

    // Sum widths of the first row to get total width
    patches[0].forEach(patch => (totalWidth += patch.width));

    // Sum heights of the first column to get total height
    patches.forEach(row => (totalHeight += row[0].height));

    // Create a new data array for the merged image
    const mergedData = new Uint8ClampedArray(
      totalWidth * totalHeight * channels
    );

    // Copy data from each patch into the new merged data array
    let currentHeightOffset = 0;
    for (let i = 0; i < patches.length; i++) {
      let currentWidthOffset = 0;
      for (let j = 0; j < patches[i].length; j++) {
        const patch = patches[i][j];

        // Copy pixel by pixel for simplicity and clarity
        for (let y = 0; y < patch.height; y++) {
          for (let x = 0; x < patch.width; x++) {
            const patchIndex = (y * patch.width + x) * channels;
            const mergedIndex =
              ((currentHeightOffset + y) * totalWidth +
                (currentWidthOffset + x)) *
              channels;

            // Copy all channels for the current pixel
            for (let c = 0; c < channels; c++) {
              mergedData[mergedIndex + c] = patch.data[patchIndex + c];
            }
          }
        }
        currentWidthOffset += patch.width;
      }
      currentHeightOffset += patches[i][0].height;
    }

    return new GeoRawImage(
      mergedData,
      totalWidth,
      totalHeight,
      channels as 1 | 2 | 3 | 4,
      bounds,
      crs
    );
  }

  /**
   * Convert pixel coordinates to world coordinates
   */
  pixelToWorld(x: number, y: number): [number, number] {
    const worldX =
      this.transform.a * x + this.transform.b * y + this.transform.c;
    const worldY =
      this.transform.d * x + this.transform.e * y + this.transform.f;
    return [worldX, worldY];
  }

  /**
   * Convert world coordinates to pixel coordinates
   */
  worldToPixel(lon: number, lat: number): [number, number] {
    // Inverse transform
    const det =
      this.transform.a * this.transform.e - this.transform.b * this.transform.d;
    const x =
      (this.transform.e * (lon - this.transform.c) -
        this.transform.b * (lat - this.transform.f)) /
      det;
    const y =
      (-this.transform.d * (lon - this.transform.c) +
        this.transform.a * (lat - this.transform.f)) /
      det;
    return [Math.round(x), Math.round(y)];
  }

  /**
   * Get the bounds of the image
   */
  getBounds(): Bounds {
    return { ...this.bounds };
  }

  /**
   * Get the CRS of the image
   */
  getCRS(): string {
    return this.crs;
  }

  /**
   * Create a new GeoRawImage from a RawImage and georeferencing information
   */
  static fromRawImage(
    rawImage: RawImage,
    bounds: Bounds,
    crs: string = "EPSG:4326"
  ): GeoRawImage {
    return new GeoRawImage(
      rawImage.data,
      rawImage.width,
      rawImage.height,
      rawImage.channels as 1 | 2 | 3 | 4,
      bounds,
      crs
    );
  }

  /**
   * Override the clone method to include georeferencing information
   */
  override clone(): GeoRawImage {
    return new GeoRawImage(
      this.data.slice(),
      this.width,
      this.height,
      this.channels,
      { ...this.bounds },
      this.crs
    );
  }
}
