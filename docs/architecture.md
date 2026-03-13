# EmberShine — System Architecture

## Overview

EmberShine is a personal blog platform where all content originates from Telegram messages.
Public content is stored as Markdown files in GitHub and rendered by Next.js on Vercel.
Private content (diary) lives exclusively in Supabase and is never committed to Git.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CONTENT CREATION                             │
│                                                                         │
│   Shine (Telegram)                                                      │
│        │                                                                │
│        │ message / photo                                                │
│        ▼                                                                │
│   Telegram Bot API ──webhook──▶ /api/telegram/[secret]                 │
│                                        │                               │
│                            ┌───────────┴────────────┐                  │
│                            │    Command Parser        │                  │
│                            │  (src/lib/telegram/      │                  │
│                            │   commands.ts)           │                  │
│                            └───────────┬────────────┘                  │
│                                        │                               │
│              ┌─────────────┬───────────┼───────────────┐              │
│              ▼             ▼           ▼               ▼              │
│         /private        /draft      photo_post      /pending           │
│            │              │             │               │              │
│            ▼              ▼             ▼               ▼              │
│       diary_entries   draft_posts   inbox_messages  inbox_messages      │
│       (Supabase)      (Supabase)    (Supabase)      (Supabase)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          APPROVAL & PUBLISHING                          │
│                                                                         │
│   Telegram inline keyboard (approve / edit / reject / view_full)        │
│        │                                                                │
│        │ callback_query                                                 │
│        ▼                                                                │
│   /api/telegram/[secret] ──▶ /api/telegram/approve                     │
│                                        │                               │
│                            runApprovalPipeline()                       │
│                                        │                               │
│              ┌─────────────┬───────────┼───────────────┐              │
│              ▼             ▼           ▼               ▼              │
│       Download photo   Upload JPEG  Build Markdown   Push to GitHub    │
│       (Telegram API)   → R2 bucket  (frontmatter     (Contents API)    │
│                        (raw JPEG,   + body)           PUT /contents/   │
│                         no Sharp)                     content/…/…md)   │
│              │                                         │               │
│              └─────────────────────────────────────────┘               │
│                                        │                               │
│                                 Vercel auto-deploy                     │
│                                 (2–5 min to live)                      │
│                                        │                               │
│                              SNS draft → Telegram                      │
│                          (X/Twitter + LinkedIn via Gemini)              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            PUBLIC RENDERING                             │
│                                                                         │
│   GitHub (victjay/EmberShine)                                           │
│   └── content/                                                          │
│       ├── blog/*.md          ──▶  /blog/[slug]                         │
│       ├── stories/*.md       ──▶  /stories/[slug]                      │
│       └── portfolio/*.md     ──▶  /portfolio/[slug]                    │
│                                                                         │
│   Next.js 16 (Vercel)                                                   │
│   ├── Static pages (SSG at build time)                                  │
│   ├── search-index.json  (prebuild)                                     │
│   ├── related-posts.json (prebuild)                                     │
│   └── RSS feeds (/feed.xml, /blog/feed.xml, /stories/feed.xml)         │
│                                                                         │
│   R2 (Cloudflare)                                                       │
│   └── media/images/*.jpg  (referenced by markdown frontmatter)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         PRIVATE / AUTH LAYER                            │
│                                                                         │
│   /private/*  ─────▶  src/proxy.ts (Next.js 16 proxy convention)       │
│                               │                                         │
│                        Supabase Auth (cookie session)                   │
│                               │                                         │
│                        ┌──────┴──────┐                                 │
│                         No session    Has session                       │
│                              │              │                           │
│                         redirect /login   allow through                 │
│                                                                         │
│   Supabase tables (RLS enabled):                                        │
│   ├── diary_entries       (auth.uid() only)                            │
│   ├── inbox_messages      (service role only from server)              │
│   ├── draft_posts         (service role only from server)              │
│   └── profiles            (auth.uid() own row only)                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          BATCH AUTOMATION                               │
│                                                                         │
│   GitHub Actions — daily-batch.yml (daily 03:17 KST)                   │
│   ├── Job 1: SEO Check        (missing meta → Telegram alert)          │
│   ├── Job 2: AI Suggestions   (Gemini content ideas → Telegram)        │
│   ├── Job 3: Media Optimize   (Sharp JPEG→WebP, EXIF strip)            │
│   ├── Job 4: Stats Collect    (Supabase counts → Telegram)             │
│   ├── Job 5: Draft Reminder   (pending >7 days → Telegram alert)       │
│   └── Job 6: Weekly Report    (Monday only — Cloudflare + R2 + Supa)   │
│                                                                         │
│   GitHub Actions — weekly-backup.yml (Sunday 02:00 KST)                │
│   ├── Job 1: DB Backup        (pg_dump → AES-256 → R2 backups/db/)     │
│   └── Job 2: R2 Manifest      (object list JSON → R2 backups/r2-manifest/)│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities

| Service | Role | Data stored |
|---------|------|-------------|
| **Vercel** | Hosts Next.js app; auto-deploys on GitHub push | None (stateless) |
| **GitHub** | Source of truth for all public markdown content | `content/**/*.md`, all source code |
| **Supabase** | Private data store; Auth provider | `diary_entries`, `inbox_messages`, `draft_posts`, `profiles` |
| **Cloudflare R2** | Media storage; backups | `/media/images/*.jpg`, `/backups/**` |
| **Telegram Bot** | Content ingestion interface | None (messages → Supabase inbox) |
| **Google Gemini** | AI draft + SNS copy generation | None (stateless API) |
| **Giscus** | Comments (GitHub Discussions) | GitHub Discussions on this repo |
| **Cloudflare Web Analytics** | Privacy-friendly visitor tracking | Cloudflare (beacon token: `6e1718…`) |
| **GitHub Actions** | Batch automation; backup | None (ephemeral runners) |

---

## Data Flow: New Post (Happy Path)

1. Shine sends Telegram message (text ± photo)
2. Webhook receives update → parses command → saves to `inbox_messages` (status: `pending`)
3. If AI draft: fires `/api/telegram/draft` → Gemini generates draft → saves to `draft_posts`
4. Bot sends preview with inline keyboard to Telegram
5. Shine taps ✅ Approve → `callback_query` → fires `/api/telegram/approve`
6. Pipeline: photo download → R2 upload → markdown build → GitHub push → status: `published`
7. Vercel detects push → rebuilds → live in ~2–5 min
8. Gemini generates SNS drafts → sent to Telegram for manual posting

## Data Flow: Private Diary Entry

1. Shine sends `/private` message via Telegram
2. Webhook saves directly to `diary_entries` (Supabase), status: `private`
3. Accessible only at `/private/diary` with active Supabase session
4. Never touches GitHub

## Data Flow: Weekly Backup (Sunday)

1. `weekly-backup.yml` triggers on schedule
2. `backup-db.js`: pg_dump via IPv4 pooler → AES-256 encrypt → upload to `R2: backups/db/`
3. `backup-r2.js`: ListObjectsV2 (excluding `backups/` prefix) → manifest JSON → `R2: backups/r2-manifest/`
4. Both prune to 4 most recent; Telegram confirmation sent
