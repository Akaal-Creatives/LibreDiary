import type Konva from 'konva';

export interface ExportAnnotatedImageOptions {
  image: HTMLImageElement;
  stage: Konva.Stage;
  fileName: string;
  mimeType?: string;
  quality?: number;
}

/**
 * Export an annotated image by compositing the original image with the
 * Konva annotation stage onto a single canvas, then triggering a download.
 *
 * Returns the resulting Blob for further use (e.g. uploading as a new file).
 */
export async function exportAnnotatedImage(
  options: ExportAnnotatedImageOptions
): Promise<Blob | null> {
  const { image, stage, fileName, mimeType = 'image/png', quality = 0.92 } = options;

  const width = image.naturalWidth || stage.width();
  const height = image.naturalHeight || stage.height();

  // Create a composite canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw the original image as the background
  ctx.drawImage(image, 0, 0, width, height);

  // Draw the Konva stage (annotations) on top
  const stageCanvas = stage.toCanvas();
  ctx.drawImage(stageCanvas, 0, 0, width, height);

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });

  if (!blob) return null;

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return blob;
}
