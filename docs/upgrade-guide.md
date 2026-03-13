# EmberShine — Upgrade Guide

When to upgrade each service, what you gain, and what it costs.
Current setup runs entirely on free/hobby tiers.

---

## Supabase → Pro ($25/month)

**Current limits (Free tier):**
- 500 MB database storage
- 1 GB file storage
- 50,000 monthly active users
- No daily backups (manual only via `weekly-backup.yml`)
- Pauses after 1 week of inactivity

**Upgrade when:**
- Database size approaches 400 MB (`/stats` command or Supabase Dashboard → Settings → Usage)
- You need point-in-time recovery
- The project gets consistent daily traffic (avoid inactivity pauses)
- You need read replicas for performance

**What you gain:**
- 8 GB database storage
- Daily automatic backups with PITR
- No project pausing
- Priority support

**Action:** Supabase Dashboard → Settings → Billing → Upgrade to Pro

---

## Vercel → Pro ($20/month)

**Current limits (Hobby tier):**
- Cron jobs: daily minimum (no sub-daily precision)
- 100 GB bandwidth/month
- Shared compute
- Preview deployments always public

**Upgrade when:**
- You need cron jobs more frequent than once/day
- Monthly bandwidth consistently exceeds 80 GB
- You need password-protected preview deployments (security)
- You need dedicated compute for faster cold starts

**What you gain:**
- Cron precision down to 1 minute
- Password-protected preview deployments
- 1 TB bandwidth
- Team collaboration features

**Action:** vercel.com/account/billing → Upgrade to Pro

> Note: For sub-daily scheduling (e.g. hourly stats), an alternative is to use
> GitHub Actions on a tighter cron schedule rather than upgrading Vercel.

---

## Cloudflare R2 → Paid

**Current limits (Free tier):**
- 10 GB storage
- 1 million Class A operations/month (write/list)
- 10 million Class B operations/month (read)
- Free egress (always — R2 has no egress fees)

**Upgrade when:**
- Storage approaches 8 GB (check via `node scripts/list-r2.js`)
- Write operations exceed 800k/month (unlikely unless bulk uploads)

**Pricing (pay-as-you-go, no tier upgrade needed):**
- Storage: $0.015/GB/month above 10 GB
- Class A ops: $4.50/million above free tier
- Class B ops: $0.36/million above free tier

**Action:** No action needed — billing automatically activates when you exceed free limits.
Add payment method in Cloudflare Dashboard → Billing.

---

## Cloudflare Stream (Video Content)

**Currently:** Not in use. R2 stores only JPEG/WebP images.

**Upgrade when:**
- You want to embed videos in blog posts or stories
- Video content becomes a regular part of the workflow

**Pricing:**
- $5/month per 1,000 minutes of stored video
- $1 per 1,000 minutes of delivered video

**What to build:**
- Add video upload support in the Telegram → approval pipeline
- Store in Cloudflare Stream instead of R2
- Render with `<stream>` embed in MDX components

---

## Google Gemini API → Higher Quota

**Current model:** Gemini 2.5 Flash (`GOOGLE_GENERATIVE_AI_API_KEY`)

**Free tier limits:**
- 15 RPM (requests per minute)
- 1,500 RPD (requests per day)
- Sufficient for current usage (1–5 drafts/day)

**Upgrade when:**
- You publish more than ~40 posts/day
- You add real-time AI features (e.g. live suggestions while typing)
- You want faster response times with guaranteed SLAs

**Options:**
- Switch to pay-as-you-go: ~$0.075/million input tokens, ~$0.30/million output tokens
- Upgrade to Gemini 1.5 Pro for higher quality at higher cost

**Action:** Google AI Studio → Billing → Enable pay-as-you-go

---

## X (Twitter) API → After Reviewing Pricing

**Current status:** SNS drafts generated but **not auto-posted** (disabled by default).

**API cost reality (as of 2026):**
- Free tier: 500 tweets/month (write only, no read)
- Basic tier: $100/month — 3,000 tweets/month
- Pro tier: $5,000/month

**Recommendation:** Given the pricing, manual posting from Telegram drafts is strongly preferred.
Auto-posting makes sense only if you publish very frequently and want zero friction.

**To enable auto-posting when ready:**
1. Apply for API access at developer.twitter.com
2. Get `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
3. Add to `.env.local` and Vercel env vars
4. Set `SNS_AUTO_POST_ENABLED=true` in Vercel env vars
5. Implement the posting call in `src/lib/ai/sns-draft.ts`

---

## LinkedIn API → After OAuth Setup

**Current status:** LinkedIn drafts generated but **not auto-posted** (disabled by default).

**Requirements to enable:**
1. LinkedIn Developer account → create app
2. Request `w_member_social` permission (requires LinkedIn review)
3. Set up OAuth 2.0 flow (3-legged — requires user authorization)
4. Refresh tokens expire every 60 days (needs renewal automation)

**Recommendation:** LinkedIn's OAuth setup is significant engineering work.
Use Telegram drafts for manual posting until traffic justifies the automation.

---

## Summary: Upgrade Priority Order

| Priority | Service | Trigger |
|----------|---------|---------|
| 1st | **Vercel Pro** | Preview deployments need password protection |
| 2nd | **Supabase Pro** | DB > 400 MB or project starts pausing |
| 3rd | **Cloudflare R2** | Storage > 8 GB (auto-billing, no action) |
| 4th | **Gemini pay-as-you-go** | > 40 AI drafts/day |
| 5th | **Cloudflare Stream** | Regular video content |
| 6th | **X/LinkedIn API** | After reviewing cost vs. benefit |
