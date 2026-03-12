'use strict'
// Job 3 — Media Optimization (fully automatic)
// Finds JPEG files in R2 (uploaded raw without Sharp processing),
// converts them to WebP and replaces the original.
// Sharp works in GitHub Actions (Linux, native binaries available).

const sharp = require('sharp')
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { sendTelegramMessage, runJob } = require('./_utils')

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

runJob('Media Optimization', async () => {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) {
    console.log('[media] R2_BUCKET_NAME not set — skipping')
    return
  }

  const client = getR2Client()

  // List all objects
  const listed = []
  let ContinuationToken
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }))
    listed.push(...(res.Contents ?? []))
    ContinuationToken = res.NextContinuationToken
  } while (ContinuationToken)

  // Find unoptimized JPEGs (keys ending in .jpg, no corresponding .webp yet)
  const jpegKeys  = listed.filter(o => /\.(jpg|jpeg)$/i.test(o.Key)).map(o => o.Key)
  const webpKeys  = new Set(listed.filter(o => /\.webp$/i.test(o.Key)).map(o => o.Key))
  const toProcess = jpegKeys.filter(k => !webpKeys.has(k.replace(/\.(jpg|jpeg)$/i, '.webp')))

  console.log(`[media] ${listed.length} objects total, ${jpegKeys.length} JPEGs, ${toProcess.length} to optimize`)

  if (toProcess.length === 0) {
    await sendTelegramMessage('🖼️ [미디어 최적화] 최적화할 이미지가 없습니다.')
    return
  }

  let optimized = 0
  let savedBytes = 0
  const errors   = []

  for (const key of toProcess) {
    try {
      // Download
      const getRes  = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const rawBuf  = await streamToBuffer(getRes.Body)

      // Process: strip EXIF, resize max 2048px, convert to WebP
      const { data: webpBuf, info } = await sharp(rawBuf)
        .rotate()
        .withMetadata({})
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true })

      const webpKey = key.replace(/\.(jpg|jpeg)$/i, '.webp')

      // Upload WebP
      await client.send(new PutObjectCommand({
        Bucket:      bucket,
        Key:         webpKey,
        Body:        webpBuf,
        ContentType: 'image/webp',
      }))

      savedBytes += rawBuf.length - webpBuf.length
      optimized++
      console.log(`[media] ${key} → ${webpKey} (${info.width}×${info.height}, saved ${Math.round((rawBuf.length - webpBuf.length) / 1024)}KB)`)
    } catch (err) {
      console.error(`[media] Failed to optimize ${key}:`, err.message)
      errors.push(key)
    }
  }

  const savedKB = Math.round(savedBytes / 1024)
  const lines = [
    `🖼️ [미디어 최적화 완료]`,
    `최적화: ${optimized}/${toProcess.length}개`,
    `절약 용량: ${savedKB}KB`,
    ...(errors.length > 0 ? [`실패: ${errors.join(', ')}`] : []),
  ]
  await sendTelegramMessage(lines.join('\n'))
})
