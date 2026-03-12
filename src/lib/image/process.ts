// Server-side image processing — EXIF GPS and device identifiers stripped from all public images
import sharp from 'sharp'
import ExifReader from 'exifr'

export interface ProcessedImage {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
}

export interface ExtractedMeta {
  shootingDate: string | null   // ISO string, preserved as data (not in image)
  cameraModel: string | null    // e.g. "iPhone 14 Pro", preserved as data
}

const MAX_DIMENSION = 2048
const WEBP_QUALITY = 85

// Extract shooting date and camera model BEFORE stripping EXIF from image
async function extractMeta(input: Buffer): Promise<ExtractedMeta> {
  try {
    const exif = await ExifReader.parse(input, {
      pick: ['DateTimeOriginal', 'Model'],
    })
    return {
      shootingDate: exif?.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal).toISOString()
        : null,
      cameraModel: exif?.Model ?? null,
    }
  } catch {
    return { shootingDate: null, cameraModel: null }
  }
}

export async function processImage(
  input: Buffer,
): Promise<ProcessedImage & ExtractedMeta> {
  // 1. Extract metadata we want to preserve as DATA before stripping from image
  const meta = await extractMeta(input)

  // 2. Process: apply EXIF orientation → strip ALL metadata (incl. GPS) → resize → WebP
  const { data, info } = await sharp(input)
    .rotate()                    // honour EXIF orientation, then discard orientation tag
    .withMetadata({})            // strip all EXIF/IPTC/XMP (GPS, device serial, etc.)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    mimeType: 'image/webp',
    width: info.width,
    height: info.height,
    ...meta,
  }
}
