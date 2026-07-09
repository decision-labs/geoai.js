declare module 'geoai' {
  export interface ProviderParams {
    provider: string;
    serviceUrl?: string;
    serviceName?: string;
    tileSize?: number;
    attribution?: string;
    projectRef?: string;
    apikey?: string;
    cogImagery?: string;
    apiKey?: string;
    style?: string;
    tasks?: any[];
  }

  export const geoai: {
    pipeline: (tasks: any[], providerParams: ProviderParams) => Promise<any>;
  };
}
