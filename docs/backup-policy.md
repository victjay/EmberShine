# EmberShine — Backup Policy

> Implementation planned for Phase 3–4. This document defines the intended policy.

## Data Classification

| Layer | Storage | Backup strategy |
|-------|---------|-----------------|
| Public content (posts) | GitHub repo | Git history is the backup |
| Private content (diary) | Supabase PostgreSQL | Supabase automatic daily backups + manual export |
| Media (images) | Cloudflare R2 | R2 versioning + periodic export to secondary storage |
| Auth & RLS schema | Supabase | SQL migration files in `supabase/migrations/` |
| Secrets | `.env.local` (local only) | Owner's responsibility — document all keys in CLAUDE.md |

## Public Content (GitHub)

- All blog, stories, and portfolio posts are markdown files committed to GitHub.
- Git history provides full version history and point-in-time recovery.
- GitHub repository acts as the primary and backup store simultaneously.
- Vercel deploys from GitHub — no additional backup needed.

## Private Content (Supabase)

- Supabase Pro/Team plans include daily automated backups (7-day retention).
- For Hobby plan: manually export via `pg_dump` or Supabase dashboard weekly.
- Migration SQL is version-controlled in `supabase/migrations/` — schema is always recoverable.

**Manual export command (Phase 3–4 implementation):**
```bash
pg_dump postgresql://postgres:[password]@[host]:5432/postgres \
  --table=diary_entries --table=inbox_messages \
  -Fc -f backup_$(date +%Y%m%d).dump
```

## Media (Cloudflare R2)

- Enable R2 object versioning in bucket settings.
- Periodic sync to a secondary location (e.g., Backblaze B2) — implementation in Phase 4.
- Critical media should also be backed up locally before upload.

## Recovery Procedures

### Scenario: Accidental diary entry deletion
1. Restore from Supabase point-in-time recovery (if on Pro plan)
2. Or restore from most recent manual pg_dump

### Scenario: Blog post accidentally deleted from GitHub
1. `git log --all --full-history -- path/to/post.md`
2. `git checkout <commit-hash> -- path/to/post.md`

### Scenario: Full service recovery
1. Redeploy to Vercel from GitHub (automatic)
2. Restore Supabase DB from backup
3. R2 media persists independently

## Retention Policy

- Blog/portfolio posts: indefinite (Git history)
- Diary entries: indefinite (owner's choice)
- Deleted media (R2): 30-day versioning window
- Auth logs: Supabase default (varies by plan)

## Phase 3–4 Automation TODO

- [ ] Weekly Supabase pg_dump via GitHub Actions
- [ ] R2 → Backblaze B2 nightly sync script
- [ ] Backup health check alert (Telegram notification)
