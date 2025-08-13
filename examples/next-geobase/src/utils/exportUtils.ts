// Utility functions for exporting data
export class ExportUtils {
  static downloadGeoJSON(data: GeoJSON.FeatureCollection, filename: string = 'detections.geojson') {
    // Create a blob with the GeoJSON data
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static downloadPNG(geoRawImage: any, filename: string = 'geoimage.png') {
    try {
      // Safe way to get sample data for debugging
      let sampleData = [];
      let actualData = null;
      
      try {
        // The data might be nested in the data object
        if (geoRawImage.data && typeof geoRawImage.data === 'object') {
          // Check if data has a data property (nested)
          if (geoRawImage.data.data) {
            actualData = geoRawImage.data.data;
          } 
          // Check if data has numbered indices (like an array-like object)
          else if (geoRawImage.data[0] !== undefined) {
            // Convert object with numbered keys to array
            const dataKeys = Object.keys(geoRawImage.data);
            if (dataKeys.length > 0 && !isNaN(parseInt(dataKeys[0]))) {
              // This is an object with numeric string keys, convert to Uint8Array
              actualData = new Uint8ClampedArray(dataKeys.length);
              for (let i = 0; i < dataKeys.length; i++) {
                actualData[i] = geoRawImage.data[i.toString()];
              }
            } else {
              actualData = geoRawImage.data;
            }
          }
          // Check if data has length property
          else if (geoRawImage.data.length !== undefined) {
            actualData = geoRawImage.data;
          }
        }
        
        if (actualData) {
          if (typeof actualData.subarray === 'function') {
            sampleData = Array.from(actualData.subarray(0, 20));
          } else if (Array.isArray(actualData)) {
            sampleData = actualData.slice(0, 20);
          } else if (actualData.length) {
            // Convert to array for any array-like object
            sampleData = Array.from(actualData).slice(0, 20);
          }
        }
      } catch (e) {
        console.error('Error accessing data:', e);
        sampleData = ['Error accessing data'];
      }

      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions
      canvas.width = geoRawImage.width;
      canvas.height = geoRawImage.height;

      // Check if we have a RawImage object with a toCanvas method
      if (typeof geoRawImage.toCanvas === 'function') {
        // Use the built-in toCanvas method if available
        const sourceCanvas = geoRawImage.toCanvas();
        ctx.drawImage(sourceCanvas, 0, 0);
      } else {
        
        if (!actualData) {
          throw new Error('No valid image data found');
        }
        
        // Create ImageData from the raw image data
        const imageData = ctx.createImageData(geoRawImage.width, geoRawImage.height);
        
        // Handle different channel formats
        const channels = geoRawImage.channels || 4;
        const sourceData = actualData;
        
        // Manual pixel processing
        if (channels === 4) {
          // RGBA format - direct copy from any array-like structure
          for (let i = 0; i < sourceData.length && i < imageData.data.length; i++) {
            imageData.data[i] = sourceData[i];
          }
        } else if (channels === 3) {
          // RGB format - add alpha channel
          for (let i = 0; i < geoRawImage.width * geoRawImage.height; i++) {
            const srcIdx = i * 3;
            const dstIdx = i * 4;
            imageData.data[dstIdx] = sourceData[srcIdx];     // R
            imageData.data[dstIdx + 1] = sourceData[srcIdx + 1]; // G
            imageData.data[dstIdx + 2] = sourceData[srcIdx + 2]; // B
            imageData.data[dstIdx + 3] = 255; // A (fully opaque)
          }
        } else if (channels === 1) {
          // Grayscale format - duplicate to RGB and add alpha
          for (let i = 0; i < geoRawImage.width * geoRawImage.height; i++) {
            const gray = sourceData[i];
            const dstIdx = i * 4;
            imageData.data[dstIdx] = gray;     // R
            imageData.data[dstIdx + 1] = gray; // G
            imageData.data[dstIdx + 2] = gray; // B
            imageData.data[dstIdx + 3] = 255;  // A
          }
        }
        
        // Put the image data on the canvas
        ctx.putImageData(imageData, 0, 0);
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to export PNG:', error);
      throw new Error('Failed to export image as PNG');
    }
  }

  static downloadJSON(data: any, filename: string = 'data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }

  static formatGeoJSONForCopy(data: GeoJSON.FeatureCollection): string {
    return JSON.stringify(data, null, 2);
  }

  static generateFilename(task: string, provider: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${task}-${provider}-detections-${timestamp}.geojson`;
  }

  static generateImageFilename(task: string, provider: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${task}-${provider}-geoimage-${timestamp}.png`;
  }
}
