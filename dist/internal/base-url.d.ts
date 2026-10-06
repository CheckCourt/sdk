export declare const DEFAULT_BASE_URL = "https://app.checkcourt.de";
/** Accepts the origin with or without a trailing `/api/v1`, so CLI-style URLs work too. */
export declare function normalizeBaseUrl(baseUrl: string | undefined): string;
