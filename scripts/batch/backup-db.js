'use strict'
// Backup: pg_dump Supabase → encrypt → upload to R2 under backups/db/
//
// Required env vars:
//   SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD
//   BACKUP_ENCRYPTION_KEY
//   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME

const { execSync } = require('child_process')
const fs           = require('fs')
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { sendTelegramMessage, runJob } = require('./_utils')

runJob('Backup — Supabase DB', async () => {
  const dbHost  = process.env.SUPABASE_DB_HOST ?? 'db.lddoqrgolyyshazhiuib.supabase.co'
  const dbPort  = process.env.SUPABASE_DB_PORT ?? '6543'
  const dbPass  = process.env.SUPABASE_DB_PASSWORD
  const encKey  = process.env.BACKUP_ENCRYPTION_KEY
  const bucket  = process.env.R2_BUCKET_NAME

  if (!dbPass)  throw new Error('SUPABASE_DB_PASSWORD not set')
  if (!encKey)  throw new Error('BACKUP_ENCRYPTION_KEY not set')
  if (!bucket)  throw new Error('R2_BUCKET_NAME not set')

  const dateStr  = new Date().toISOString().slice(0, 10)
  const dumpFile = `/tmp/backup_${dateStr}.dump`
  const encFile  = `${dumpFile}.enc`
  const r2Key    = `backups/db/backup_${dateStr}.dump.enc`

  // ── 1. pg_dump ─────────────────────────────────────────────────────────
  console.log('[backup-db] Running pg_dump...')
  execSync(
    `pg_dump -h "${dbHost}" -p ${dbPort} -U postgres -d postgres ` +
    `--table=diary_entries --table=inbox_messages --table=draft_posts --table=profiles ` +
    `-Fc -f "${dumpFile}"`,
    { stdio: 'inherit', env: { ...process.env, PGPASSWORD: dbPass } },
  )
  const dumpSizeKB = Math.round(fs.statSync(dumpFile).size / 1024)
  console.log(`[backup-db] Dump: ${dumpSizeKB} KB`)

  // ── 2. Encrypt with AES-256 ────────────────────────────────────────────
  execSync(
    `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 ` +
    `-pass pass:"${encKey}" -in "${dumpFile}" -out "${encFile}"`,
    { stdio: 'inherit' },
  )
  fs.unlinkSync(dumpFile)
  const encSizeKB = Math.round(fs.statSync(encFile).size / 1024)
  console.log(`[backup-db] Encrypted: ${encSizeKB} KB`)

  // ── 3. Upload to R2 ────────────────────────────────────────────────────
  const s3 = new S3Client({
    region:   'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })

  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         r2Key,
    Body:        fs.readFileSync(encFile),
    ContentType: 'application/octet-stream',
  }))
  fs.unlinkSync(encFile)
  console.log(`[backup-db] Uploaded: ${r2Key}`)

  // ── 4. Prune old backups (keep last 4) ────────────────────────────────
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'backups/db/',
  }))
  const files = (list.Contents ?? []).sort((a, b) =>
    (b.LastModified ?? 0) - (a.LastModified ?? 0),
  )
  for (const f of files.slice(4)) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: f.Key }))
    console.log(`[backup-db] Pruned: ${f.Key}`)
  }

  await sendTelegramMessage(
    `✅ DB 백업 완료\n경로: ${r2Key}\n크기: ${encSizeKB} KB\n보관: 최근 ${Math.min(files.length, 4)}개`,
  )
})
