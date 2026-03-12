// Server-side image processing with Sharp
// EXIF GPS coordinates and device identifiers must be stripped from all public images
// Placeholder — full implementation in Task 3 (image upload)

export interface ProcessedImage {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

// Strip EXIF and resize — implementation pending Task 3
export async function processImage(_input: Buffer): Promise<ProcessedImage> {
  throw new Error('processImage: not yet implemented — see Task 3')
}
