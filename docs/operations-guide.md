# EmberShine — Operations Guide

## Daily Usage: Telegram Commands

All interaction with the blog happens through Telegram.
Send messages to your bot. Only your user ID (in `TELEGRAM_ALLOWED_USER_IDS`) is accepted.

---

### Command Reference

| Command / Pattern | What it does |
|-------------------|--------------|
| `/private <text>` | Saves as private diary entry (Supabase only, never Git) |
| `/draft <text>` | Saves as blog draft without AI generation |
| `/draft #tag1 #tag2 <text>` | Draft with manual tags |
| `<text>` (plain) | Sends to AI pipeline → generates draft → sends preview to Telegram |
| `<photo> + caption` | Photo post → AI draft with image → preview sent |
| `/inbox` | Lists all pending inbox items |
| `/draftlist` | Lists all saved drafts |
| `/stats` | Shows counts: inbox by status, diary, drafts |
| `/pending` | Same as plain text — marks ambiguous input as pending |

### Inline Keyboard (on draft preview)

After AI generates a draft, you receive a preview with buttons:

| Button | Action |
|--------|--------|
| ✅ Approve | Runs full publish pipeline (image → R2 → markdown → GitHub push) |
| ✏️ Edit | (Future) Opens edit flow |
| ❌ Reject | Marks inbox as rejected |
| 📄 View Full | Sends full body markdown to Telegram |
| 🌐 Translation | Sends English summary to Telegram |

---

## Handling Inbox Items

### Normal flow

1. Send message to bot
2. AI generates draft → preview arrives in Telegram (usually within 10–15s)
3. Review the preview
4. Tap ✅ to publish or ❌ to reject

### If no preview arrives

The AI draft generation might have failed silently. Check:
```
/inbox
```
If status shows `pending`, the item is waiting. You can re-trigger by approving from the inbox list,
or check Vercel logs for errors: Vercel Dashboard → Project → Deployments → Functions → logs.

### If approval fails (GitHub push error)

The bot will send: `❌ GitHub 푸시 실패 — 다시 시도하려면 ✅ 버튼을 눌러주세요.`
The inbox status reverts to `approved`. Tap ✅ again to retry.

Common causes:
- `GITHUB_TOKEN` expired → regenerate PAT in GitHub Settings → update Vercel env var
- Git conflict on the markdown file (same slug) → rename via `/edit`

---

## Editing Published Posts

Published posts are Markdown files in `content/blog/` or `content/stories/` on GitHub.

### Option A: Edit directly on GitHub

1. Go to `github.com/victjay/EmberShine`
2. Navigate to `content/blog/<slug>.md`
3. Click pencil icon → edit → commit directly to `main`
4. Vercel auto-deploys in ~2 min

### Option B: Edit locally

```bash
git pull origin main
# edit content/blog/<slug>.md
git add content/blog/<slug>.md
git commit -m "edit: <title>"
git push origin main
```

### Frontmatter fields you can edit

```yaml
---
title: "Post Title"
date: "2026-03-13"
description: "SEO meta description (≤150 chars)"
tags: ["tag1", "tag2"]
image: "https://pub-xxxx.r2.dev/media/images/..."
image_alt: "Alt text"
section: blog
---
```

---

## Accessing Private Diary

1. Go to `https://yoursite.com/login`
2. Sign in with your Supabase credentials
3. Navigate to `/private/diary`
4. New entries: `/private/diary/new`

Session persists via cookie. Log out by clearing cookies or via the logout button.

---

## GitHub Actions: Manual Re-run

### Run a specific batch job

GitHub → repo → Actions → `Daily Batch Automation` → `Run workflow`

Input options for the `job` field:
- `all` — run all 6 jobs
- `seo` — SEO check only
- `suggestions` — AI suggestions only
- `media` — media optimization only
- `stats` — statistics collection only
- `reminder` — draft reminder only
- `weekly-report` — weekly report (ignores Monday-only guard)

### Run backup manually

GitHub → Actions → `Weekly Backup` → `Run workflow`

Input options:
- `all` — both DB and R2 manifest
- `db` — DB backup only
- `r2` — R2 manifest only

### Check job logs

GitHub → Actions → click the workflow run → click the job → expand each step.

Failed steps show ❌. `continue-on-error: true` means the workflow continues even if one job fails.
Each failed job sends a Telegram alert: `❌ [배치 실패] <Job Name>`.

---

## R2 Media Management

### List all files

```bash
node scripts/list-r2.js
```

Requires `.env.local` with R2 credentials, or pass env vars manually.

### Media optimization (batch)

The `media-optimize.js` batch job runs nightly:
- Converts JPEG → WebP
- Strips EXIF data (including GPS)
- Uploads optimized versions back to R2

Optimized files are stored alongside originals with `.webp` extension.

---

## Monitoring

### Vercel logs (real-time)

```bash
npx vercel logs --follow
```

Or: Vercel Dashboard → Project → Deployments → latest → Functions tab.

Key log lines to watch:
- `[telegram] POST handler entered` — webhook received
- `[telegram] approve fetch response status: 200` — approve pipeline triggered
- `[approve] GitHub push failed` — publish error
- `[batch] ── <Job Name>` — batch job started

### Cloudflare Web Analytics

Dashboard: cloudflare.com → Web Analytics → your site
Shows: pageviews, visitors, top pages, referrers, countries.

### Weekly Telegram Report (Mondays)

Automatically sent every Monday morning (03:17 KST) with:
- Total pageviews last 7 days
- Top 5 pages
- New posts published this week
- Pending inbox count
- R2 storage usage
