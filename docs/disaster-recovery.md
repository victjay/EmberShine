# EmberShine — Disaster Recovery

Procedures for recovering from service outages and data loss scenarios.

---

## Scenario 1: Vercel is Down

**Symptoms:** Site returns 5xx errors or is completely unreachable.

**Impact:** Blog is offline. Telegram bot still receives messages (saved to Supabase inbox). No data loss.

**Recovery steps:**

1. **Check Vercel status:** https://www.vercel-status.com
   Wait for Vercel to resolve the incident — most outages resolve within 1–2 hours.

2. **Temporary static fallback (optional):**
   If you have a Cloudflare Pages account, you can deploy a static export:
   ```bash
   npm run build
   npx vercel export   # or use Cloudflare Pages direct GitHub integration
   ```

3. **After Vercel recovers:**
   - Trigger a redeploy:
     ```bash
     git commit --allow-empty -m "trigger redeploy" && git push origin main
     ```
   - Verify site is live, then check Telegram bot webhook is still active:
     ```bash
     curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
     ```

4. **Process queued inbox items:**
   Any messages sent during the outage are saved in Supabase.
   Use `/inbox` via Telegram to see and process pending items.

---

## Scenario 2: Supabase is Down

**Symptoms:** `/private/diary` throws errors. Telegram bot fails to save inbox messages.

**Impact:** Private diary inaccessible. New Telegram messages may fail to save. Public blog (static) remains fully functional.

**Recovery steps:**

1. **Check Supabase status:** https://status.supabase.com

2. **Public blog is unaffected** — it reads from GitHub markdown, not Supabase.

3. **During outage:** Telegram messages will fail to save.
   Note down any important messages manually.

4. **After Supabase recovers:**
   - Verify connection: Supabase Dashboard → project should show green
   - Check `inbox_messages` table for any failed inserts
   - Re-send any missed Telegram messages if needed

5. **If Supabase project is paused (Free tier):**
   - Go to Supabase Dashboard → your project → click "Restore"
   - Free tier projects pause after 1 week of inactivity
   - **Prevention:** Upgrade to Pro, or trigger a DB query weekly via the stats batch job

---

## Scenario 3: Restore from Backup

Backups are stored in R2 under `backups/db/` as AES-256 encrypted `.dump.enc` files.

### Step 1: Download the backup from R2

```bash
# List available backups
node scripts/list-r2.js | grep backups/db/

# Download via AWS CLI or S3-compatible client
aws s3 cp s3://<R2_BUCKET_NAME>/backups/db/backup_YYYY-MM-DD.dump.enc ./backup.dump.enc \
  --endpoint-url https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
```

### Step 2: Decrypt

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -pass pass:"${BACKUP_ENCRYPTION_KEY}" \
  -in backup.dump.enc \
  -out backup.dump
```

`BACKUP_ENCRYPTION_KEY` must be the same passphrase used during backup.
Store it securely (password manager) — without it, the backup cannot be decrypted.

### Step 3: Restore to Supabase

```bash
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_restore \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.lddoqrgolyyshazhiuib \
  -d postgres \
  --clean --if-exists \
  -Fc backup.dump
```

> **Warning:** `--clean` drops and recreates tables before restoring.
> Run this only on a known-good empty schema, or remove `--clean` to merge.

### Step 4: Verify

```bash
# Check row counts via Telegram
/stats
```

Or query directly in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM diary_entries;
SELECT COUNT(*) FROM inbox_messages;
SELECT COUNT(*) FROM draft_posts;
```

---

## Scenario 4: R2 Media Loss

Public posts that reference R2 images will show broken images if R2 is unavailable or files are deleted.

**Recovery steps:**

1. **Check R2 manifest backup:**
   Download the latest `backups/r2-manifest/r2-manifest_YYYY-MM-DD.json` from R2.
   This lists all files that existed at backup time.

2. **Re-upload missing files:**
   If you have local copies of images, re-upload:
   ```bash
   aws s3 cp ./local-image.jpg s3://<bucket>/media/images/<key>.jpg \
     --endpoint-url https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com \
     --content-type image/jpeg
   ```

3. **If images are permanently lost:**
   Edit the affected markdown files in GitHub to remove or replace the broken image references.

---

## Scenario 5: GitHub Repository Compromised or Deleted

**Impact:** All public content (markdown files) lost. Code lost. Vercel stops deploying.

**Recovery steps:**

1. **Code is recoverable** from any developer machine:
   ```bash
   git log --oneline   # verify local history
   # Create new GitHub repo and push
   git remote set-url origin https://github.com/victjay/EmberShine-restored.git
   git push origin main
   ```

2. **Content is recoverable** from the built Vercel deployment (HTML) or from Supabase draft_posts.

3. **Update Vercel** to point to new repository:
   Vercel Dashboard → Settings → Git → Disconnect → Connect new repo

4. **Re-register Telegram webhook** with same `NEXT_PUBLIC_SITE_URL`.

---

## Scenario 6: Regenerate Telegram Webhook

Use this if:
- You change `TELEGRAM_WEBHOOK_SECRET`
- You change the domain
- Telegram stops delivering messages

```bash
# Set env vars first
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_WEBHOOK_SECRET=...
export NEXT_PUBLIC_SITE_URL=https://yoursite.com

# Register
bash scripts/register-webhook.sh

# Verify
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expected response fields:
```json
{
  "url": "https://yoursite.com/api/telegram/<secret>",
  "has_custom_certificate": false,
  "pending_update_count": 0,
  "allowed_updates": ["message", "callback_query"]
}
```

If `pending_update_count` is high, messages queued during downtime will be delivered rapidly.

---

## Scenario 7: `BACKUP_ENCRYPTION_KEY` Lost

**Impact:** All existing encrypted backups are permanently unrecoverable.

**Recovery:**
1. The DB data is still live in Supabase — no data loss yet
2. Immediately set a new `BACKUP_ENCRYPTION_KEY` in GitHub Secrets and Vercel env
3. Trigger a fresh backup: GitHub → Actions → Weekly Backup → `Run workflow`
4. Store the new key securely in a password manager

**Prevention:** Store `BACKUP_ENCRYPTION_KEY` in at least two secure locations
(e.g. password manager + encrypted notes app).

---

## Contact & Status Pages

| Service | Status page |
|---------|-------------|
| Vercel | https://www.vercel-status.com |
| Supabase | https://status.supabase.com |
| Cloudflare | https://www.cloudflarestatus.com |
| GitHub | https://www.githubstatus.com |
| Telegram | https://downdetector.com/status/telegram |
