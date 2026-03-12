'use strict'
// Backup: pg_dump Supabase → encrypt → upload to Google Drive.
// Called from weekly-backup.yml; can also be run manually.
//
// Required env vars:
//   SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD
//   BACKUP_ENCRYPTION_KEY
//   GOOGLE_SERVICE_ACCOUNT_JSON  (base64-encoded service account JSON)
//   GDRIVE_BACKUP_FOLDER_ID

const { execSync }       = require('child_process')
const fs                 = require('fs')
const path               = require('path')
const { google }         = require('googleapis')
const { sendTelegramMessage, runJob } = require('./_utils')

runJob('Backup — Supabase DB', async () => {
  const dbHost       = process.env.SUPABASE_DB_HOST ?? `db.lddoqrgolyyshazhiuib.supabase.co`
  const dbPassword   = process.env.SUPABASE_DB_PASSWORD
  const encKey       = process.env.BACKUP_ENCRYPTION_KEY
  const saJson       = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId     = process.env.GDRIVE_BACKUP_FOLDER_ID

  if (!dbPassword)  throw new Error('SUPABASE_DB_PASSWORD not set')
  if (!encKey)      throw new Error('BACKUP_ENCRYPTION_KEY not set')
  if (!saJson)      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  if (!folderId)    throw new Error('GDRIVE_BACKUP_FOLDER_ID not set')

  const dateStr  = new Date().toISOString().slice(0, 10)
  const dumpFile = `/tmp/backup_${dateStr}.dump`
  const encFile  = `${dumpFile}.enc`

  // ── 1. pg_dump ─────────────────────────────────────────────────────────
  console.log('[backup-db] Running pg_dump...')
  execSync(
    `PGPASSWORD="${dbPassword}" pg_dump ` +
    `"postgresql://postgres:${dbPassword}@${dbHost}:5432/postgres" ` +
    `--table=diary_entries --table=inbox_messages --table=draft_posts --table=profiles ` +
    `-Fc -f "${dumpFile}"`,
    { stdio: 'inherit' },
  )
  const dumpSizeKB = Math.round(fs.statSync(dumpFile).size / 1024)
  console.log(`[backup-db] Dump created: ${dumpSizeKB} KB`)

  // ── 2. Encrypt with AES-256 ────────────────────────────────────────────
  execSync(
    `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 ` +
    `-pass pass:"${encKey}" -in "${dumpFile}" -out "${encFile}"`,
    { stdio: 'inherit' },
  )
  fs.unlinkSync(dumpFile)  // remove plaintext immediately
  const encSizeKB = Math.round(fs.statSync(encFile).size / 1024)
  console.log(`[backup-db] Encrypted: ${encSizeKB} KB`)

  // ── 3. Upload to Google Drive ──────────────────────────────────────────
  const credentials = JSON.parse(Buffer.from(saJson, 'base64').toString('utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  const drive = google.drive({ version: 'v3', auth })

  const fileName = path.basename(encFile)
  const res = await drive.files.create({
    requestBody: {
      name:    fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/octet-stream',
      body:     fs.createReadStream(encFile),
    },
    fields: 'id,name,size',
  })
  fs.unlinkSync(encFile)
  console.log(`[backup-db] Uploaded: ${res.data.name} (id: ${res.data.id})`)

  // ── 4. Prune old backups (keep last 4 weeks) ───────────────────────────
  const list = await drive.files.list({
    q:       `'${folderId}' in parents and name contains 'backup_' and name contains '.dump.enc'`,
    orderBy: 'createdTime desc',
    fields:  'files(id,name)',
    pageSize: 50,
  })
  const files = list.data.files ?? []
  const toDelete = files.slice(4)  // keep 4 most recent
  for (const f of toDelete) {
    await drive.files.delete({ fileId: f.id })
    console.log(`[backup-db] Pruned old backup: ${f.name}`)
  }

  await sendTelegramMessage(
    `✅ DB 백업 완료\n파일: ${fileName}\n크기: ${encSizeKB} KB\n보관: 최근 ${files.length < 4 ? files.length : 4}개`,
  )
})
