export const SUPPORTED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
export const MIN_IMAGE_WIDTH = 600;
export const MIN_IMAGE_HEIGHT = 900;
export const TARGET_IMAGE_WIDTH = 1000;
export const TARGET_IMAGE_HEIGHT = 1500;
export const TARGET_RATIO = 2 / 3;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function imageRatio(dimensions: ImageDimensions) {
  return dimensions.width / dimensions.height;
}

export function isPinterestRatio(dimensions: ImageDimensions, tolerance = 0.005) {
  return Math.abs(imageRatio(dimensions) - TARGET_RATIO) <= tolerance;
}

export function validateImageMetadata(input: {
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!SUPPORTED_IMAGE_MIME.includes(input.mimeType as (typeof SUPPORTED_IMAGE_MIME)[number])) errors.push('UNSUPPORTED_MIME');
  if (input.bytes <= 0 || input.bytes > MAX_IMAGE_BYTES) errors.push('FILE_SIZE');
  if (input.width < MIN_IMAGE_WIDTH || input.height < MIN_IMAGE_HEIGHT) errors.push('RESOLUTION_TOO_LOW');
  if (!isPinterestRatio(input)) warnings.push('NORMALIZATION_REQUIRED');
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    target: { width: TARGET_IMAGE_WIDTH, height: TARGET_IMAGE_HEIGHT, ratio: '2:3' as const },
  };
}

export function computeCoverCrop(
  source: ImageDimensions,
  target: ImageDimensions = { width: TARGET_IMAGE_WIDTH, height: TARGET_IMAGE_HEIGHT },
  verticalBias: 'top' | 'center' | 'bottom' = 'center',
): CropRect {
  const sourceRatio = source.width / source.height;
  const targetRatio = target.width / target.height;

  if (sourceRatio > targetRatio) {
    const sw = source.height * targetRatio;
    return { sx: (source.width - sw) / 2, sy: 0, sw, sh: source.height };
  }

  const sh = source.width / targetRatio;
  const overflow = source.height - sh;
  const sy = verticalBias === 'top' ? 0 : verticalBias === 'bottom' ? overflow : overflow / 2;
  return { sx: 0, sy, sw: source.width, sh };
}

export async function sha256Hex(buffer: ArrayBuffer) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
