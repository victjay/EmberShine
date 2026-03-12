'use strict'
// List all objects in the R2 bucket with size and key.
// Manual run: node scripts/list-r2.js
// Reads from .env.local via dotenv or environment.

const path = require('path')

// Load .env.local if running locally
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
} catch {
  // dotenv not installed — env vars must be set manually
}

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3')

;(async () => {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) { console.error('R2_BUCKET_NAME not set'); process.exit(1) }

  const objects = []
  let ContinuationToken

  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }))
    objects.push(...(res.Contents ?? []))
    ContinuationToken = res.NextContinuationToken
  } while (ContinuationToken)

  objects.sort((a, b) => (b.LastModified ?? 0) - (a.LastModified ?? 0))

  console.log(`\nR2 bucket: ${bucket} — ${objects.length} objects\n`)
  let totalBytes = 0
  for (const obj of objects) {
    const kb = Math.round((obj.Size ?? 0) / 1024)
    console.log(`  ${obj.Key.padEnd(60)} ${kb}KB  ${obj.LastModified?.toISOString().slice(0, 10) ?? ''}`)
    totalBytes += obj.Size ?? 0
  }
  console.log(`\nTotal: ${Math.round(totalBytes / 1024 / 1024 * 10) / 10}MB`)
})()
