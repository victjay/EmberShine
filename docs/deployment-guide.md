# EmberShine — Deployment Guide

## Prerequisites

- Node.js 20+ (via nvm)
- GitHub account with repo `victjay/EmberShine`
- Vercel account (Hobby tier sufficient)
- Supabase project (`lddoqrgolyyshazhiuib`)
- Cloudflare account with R2 enabled
- Telegram Bot (via @BotFather)
- Google Cloud project with Gemini API enabled

---

## 1. Clone and Install

```bash
git clone https://github.com/victjay/EmberShine.git
cd EmberShine
npm install
```

---

## 2. Environment Variables

Create `.env.local` in the project root. **Never commit this file.**

```env
# ── GitHub ────────────────────────────────────────────────────────────
GITHUB_REPO_URL=https://github.com/victjay/EmberShine
GITHUB_TOKEN=ghp_...              # PAT: repo + contents read/write

# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://lddoqrgolyyshazhiuib.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SERVER ONLY — never expose to client
SUPABASE_DB_PASSWORD=...          # For pg_dump (migrations/backup)

# ── Cloudflare R2 ─────────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...              # SERVER ONLY
R2_SECRET_ACCESS_KEY=...          # SERVER ONLY
R2_BUCKET_NAME=embershine-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# ── Telegram ──────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...              # Your personal chat ID
TELEGRAM_ALLOWED_USER_IDS=...    # Comma-separated user IDs
TELEGRAM_WEBHOOK_SECRET=...      # Random hex (min 32 chars); forms the URL path

# ── AI ────────────────────────────────────────────────────────────────
GOOGLE_GENERATIVE_AI_API_KEY=...  # Gemini 2.5 Flash

# ── Site ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://embershine.vercel.app
```

### How to generate `TELEGRAM_WEBHOOK_SECRET`

```bash
openssl rand -hex 32
```

---

## 3. Supabase Setup

### Run migrations in Supabase SQL Editor (in order)

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_inbox_from_id.sql
supabase/migrations/003_inbox_status_extend.sql
```

### Verify RLS is enabled

In Supabase Dashboard → Table Editor → each table → RLS must show **Enabled**.
Tables: `diary_entries`, `inbox_messages`, `draft_posts`, `profiles`

---

## 4. Cloudflare R2 Setup

1. Cloudflare Dashboard → R2 → Create bucket: `embershine-media`
2. Settings → Public Access → Enable (or use custom domain)
3. Copy the public URL to `R2_PUBLIC_URL`
4. R2 → Manage R2 API tokens → Create token with **Object Read & Write** on this bucket
5. Copy Access Key ID and Secret Access Key

---

## 5. Local Development

```bash
npm run dev
```

Verify:
- [ ] `http://localhost:3000` loads
- [ ] `/blog` and `/stories` pages render
- [ ] `/private` redirects to `/login` (not logged in)
- [ ] `npm run build` completes without errors

---

## 6. Vercel Deployment

### Initial deploy

```bash
npx vercel --prod
```

Or connect GitHub repo via Vercel Dashboard → New Project → Import from GitHub.

### Set environment variables in Vercel

Vercel Dashboard → Project → Settings → Environment Variables.
Add **every variable** from `.env.local` — mark server-only vars as **Production + Preview** only.

Variables that must NOT be in client bundles (Vercel will warn if prefixed wrong):
- `SUPABASE_SERVICE_ROLE_KEY` — no `NEXT_PUBLIC_` prefix ✓
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — no `NEXT_PUBLIC_` prefix ✓
- `TELEGRAM_BOT_TOKEN` — no `NEXT_PUBLIC_` prefix ✓

### Redeploy after adding env vars

```bash
git commit --allow-empty -m "trigger redeploy" && git push origin main
```

---

## 7. Register Telegram Webhook

After deployment, register the webhook so Telegram sends updates to your Vercel URL:

```bash
TELEGRAM_BOT_TOKEN=... \
TELEGRAM_WEBHOOK_SECRET=... \
NEXT_PUBLIC_SITE_URL=https://embershine.vercel.app \
bash scripts/register-webhook.sh
```

Expected response: `"Webhook was set"`

Verify:
```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Check that `allowed_updates` includes both `"message"` and `"callback_query"`.

---

## 8. Domain Connection (Cloudflare → Vercel)

### Add custom domain in Vercel

1. Vercel Dashboard → Project → Settings → Domains → Add domain
2. Enter your domain (e.g. `embershine.dev`)
3. Vercel shows the DNS records needed

### Configure DNS in Cloudflare

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |
| CNAME | `www` | `cname.vercel-dns.com` | **DNS only** |

> **Important**: Set Cloudflare proxy to **DNS only** (grey cloud) for the Vercel domain records.
> Vercel manages its own TLS. Proxying through Cloudflare can cause certificate errors.

### Update environment variable

Once the custom domain is live, update `NEXT_PUBLIC_SITE_URL` in Vercel:
```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Then re-register the Telegram webhook with the new URL.

---

## 9. GitHub Actions Secrets

For batch automation and backups, add these secrets in:
GitHub → repo → Settings → Secrets and variables → Actions

```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_HOST          aws-0-eu-central-1.pooler.supabase.com
SUPABASE_DB_PASSWORD
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN      (Web Analytics read permission — for weekly report)
CF_SITE_TAG               6e1718e348f64fed8e73e9423ccb4d04
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
GOOGLE_GENERATIVE_AI_API_KEY
BACKUP_ENCRYPTION_KEY     (strong passphrase — keep safe, needed to decrypt backups)
```

---

## 10. Restart Checklist

After any environment change or redeploy:

- [ ] `npm run dev` starts without error
- [ ] Supabase connection alive (`NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] `.env.local` exists with all keys populated
- [ ] R2 keys NOT in any client-side code
- [ ] Telegram webhook registered and returning `"ok": true`
- [ ] Send test message via Telegram — check Vercel logs for `[telegram] POST handler entered`
- [ ] `/private` redirects to `/login`
- [ ] Build passes: `npm run build`
