'use strict'
// Backup: export R2 file list as JSON → upload to Google Drive.
//
// Required env vars:
//   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
//   GOOGLE_SERVICE_ACCOUNT_JSON  (base64-encoded)
//   GDRIVE_BACKUP_FOLDER_ID

const fs  = require('fs')
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { google }  = require('googleapis')
const { sendTelegramMessage, runJob } = require('./_utils')

runJob('Backup — R2 file list', async () => {
  const bucket   = process.env.R2_BUCKET_NAME
  const saJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID

  if (!bucket)   throw new Error('R2_BUCKET_NAME not set')
  if (!saJson)   throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  if (!folderId) throw new Error('GDRIVE_BACKUP_FOLDER_ID not set')

  // ── 1. List all R2 objects ────────────────────────────────────────────
  const s3 = new S3Client({
    region:   'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  const objects = []
  let ContinuationToken
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }))
    objects.push(...(res.Contents ?? []))
    ContinuationToken = res.NextContinuationToken
  } while (ContinuationToken)

  const totalBytes = objects.reduce((s, o) => s + (o.Size ?? 0), 0)
  const totalMB    = (totalBytes / 1024 / 1024).toFixed(2)
  console.log(`[backup-r2] ${objects.length} objects, ${totalMB} MB`)

  // ── 2. Write JSON ─────────────────────────────────────────────────────
  const dateStr  = new Date().toISOString().slice(0, 10)
  const outFile  = `/tmp/r2-list_${dateStr}.json`
  fs.writeFileSync(outFile, JSON.stringify({
    exportedAt:  new Date().toISOString(),
    bucket,
    totalObjects: objects.length,
    totalBytes,
    objects: objects.map((o) => ({
      key:          o.Key,
      size:         o.Size,
      lastModified: o.LastModified,
    })),
  }, null, 2), 'utf8')

  // ── 3. Upload to Google Drive ─────────────────────────────────────────
  const credentials = JSON.parse(Buffer.from(saJson, 'base64').toString('utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  const drive = google.drive({ version: 'v3', auth })

  const res = await drive.files.create({
    requestBody: {
      name:    `r2-list_${dateStr}.json`,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/json',
      body:     fs.createReadStream(outFile),
    },
    fields: 'id,name',
  })
  fs.unlinkSync(outFile)
  console.log(`[backup-r2] Uploaded: ${res.data.name} (id: ${res.data.id})`)

  await sendTelegramMessage(
    `✅ R2 목록 백업 완료\n파일: r2-list_${dateStr}.json\n총 ${objects.length}개 파일 / ${totalMB} MB`,
  )
})
