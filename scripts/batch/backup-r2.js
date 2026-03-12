'use strict'
// Backup: export R2 object manifest as JSON → upload to R2 under backups/r2-manifest/
//
// Required env vars:
//   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

const fs = require('fs')
const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { sendTelegramMessage, runJob } = require('./_utils')

runJob('Backup — R2 manifest', async () => {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME not set')

  const s3 = new S3Client({
    region:   'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  // ── 1. List all objects (excluding backup prefix itself) ──────────────
  const objects = []
  let ContinuationToken
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }))
    const items = (res.Contents ?? []).filter((o) => !o.Key.startsWith('backups/'))
    objects.push(...items)
    ContinuationToken = res.NextContinuationToken
  } while (ContinuationToken)

  const totalBytes = objects.reduce((s, o) => s + (o.Size ?? 0), 0)
  const totalMB    = (totalBytes / 1024 / 1024).toFixed(2)
  console.log(`[backup-r2] ${objects.length} objects, ${totalMB} MB`)

  // ── 2. Build manifest JSON ─────────────────────────────────────────────
  const dateStr  = new Date().toISOString().slice(0, 10)
  const r2Key    = `backups/r2-manifest/r2-manifest_${dateStr}.json`
  const manifest = JSON.stringify({
    exportedAt:   new Date().toISOString(),
    bucket,
    totalObjects: objects.length,
    totalBytes,
    objects: objects.map((o) => ({
      key:          o.Key,
      size:         o.Size,
      lastModified: o.LastModified,
    })),
  }, null, 2)

  // ── 3. Upload manifest to R2 ───────────────────────────────────────────
  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         r2Key,
    Body:        manifest,
    ContentType: 'application/json',
  }))
  console.log(`[backup-r2] Uploaded: ${r2Key}`)

  // ── 4. Prune old manifests (keep last 4) ──────────────────────────────
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'backups/r2-manifest/',
  }))
  const files = (list.Contents ?? []).sort((a, b) =>
    (b.LastModified ?? 0) - (a.LastModified ?? 0),
  )
  for (const f of files.slice(4)) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: f.Key }))
    console.log(`[backup-r2] Pruned: ${f.Key}`)
  }

  await sendTelegramMessage(
    `✅ R2 매니페스트 백업 완료\n경로: ${r2Key}\n총 ${objects.length}개 파일 / ${totalMB} MB`,
  )
})
