export type GeoJSONFeature = {
    id?: string | number;
    type: string;
    geometry: {
        type: string;
        coordinates: unknown;
    };
    properties?: {
        [key: string]: unknown;
        name?: string;
        type?: string;
    };
};

export type AnalysisResult = {
    image?: string;
    geojson?: unknown;
    stats?: Record<string, unknown>;
};
