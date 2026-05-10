/**
 * DEPRECATED: Data API integration not implemented.
 * This is a placeholder for future external data API integration.
 */

export interface DataApiParams {
  endpoint: string;
  params?: Record<string, string>;
}

export interface DataApiResult {
  data: any;
}

export async function fetchDataApi(params: DataApiParams): Promise<DataApiResult> {
  throw new Error("Data API is not yet integrated");
}
