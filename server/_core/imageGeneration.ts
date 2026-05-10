/**
 * DEPRECATED: Image generation not implemented.
 * This is a placeholder for future image generation integration.
 */

export interface GenerateImageParams {
  prompt: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  url: string;
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  throw new Error("Image generation is not yet integrated");
}
