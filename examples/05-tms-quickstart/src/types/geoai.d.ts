declare module 'geoai' {
  export type ProviderParams = {
    provider: string;
    baseUrl?: string;
    extension?: string;
    apiKey?: string;
    attribution?: string;
    tileSize?: number;
    headers?: Record<string, string>;
    scheme?: 'WebMercator' | 'TMS';
    serviceUrl?: string;
    serviceName?: string;
    projectRef?: string;
    apikey?: string;
    cogImagery?: string;
    style?: string;
    tasks?: unknown[];
  };

  export const geoai: {
    pipeline: (
      tasks: Array<{ task: string }>,
      providerParams: ProviderParams,
    ) => Promise<{
      inference: (params: {
        inputs: { polygon: GeoJSON.Feature };
        mapSourceParams?: { zoomLevel?: number };
      }) => Promise<{ detections?: GeoJSON.FeatureCollection }>;
    }>;
  };
}
