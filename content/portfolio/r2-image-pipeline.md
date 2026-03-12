---
title: "R2 Image Pipeline"
date: "2026-02-01"
description: "Server-side image processing pipeline with EXIF stripping, Sharp resize, and Cloudflare R2 upload."
tags: ["Node.js", "Sharp", "Cloudflare R2", "Privacy"]
status: "Complete"
---

## Problem

Photos taken on phones contain EXIF metadata including GPS coordinates, device model, and serial number. Uploading these directly to a public CDN leaks location data.

## Solution

A server-only processing pipeline that:

1. Receives image buffer from Telegram or direct upload
2. Strips all EXIF metadata using Sharp
3. Resizes to max 2048px on the long edge
4. Converts to WebP for size efficiency
5. Uploads to Cloudflare R2 with a hash-based key

## Implementation

```typescript
import sharp from 'sharp'

export async function processImage(input: Buffer) {
  const processed = await sharp(input)
    .rotate()           // apply EXIF orientation, then strip
    .withMetadata({})   // clear all metadata
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true })

  return processed
}
```

## Privacy Guarantees

- No GPS data in any uploaded file
- No device identifiers
- Hash-based filenames (no date/location inference from path)
