# MyBlog — Project Reference

## Environment Variables Required
```
GITHUB_REPO_URL          GitHub repo URL for markdown push
GITHUB_TOKEN             GitHub PAT (Actions + API push)

NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY    Supabase service role (server only, never client)
SUPABASE_DB_PASSWORD         Direct DB access (migrations only)

CLOUDFLARE_ACCOUNT_ID    R2 account ID
R2_ACCESS_KEY_ID         R2 key (server only)
R2_SECRET_ACCESS_KEY     R2 secret (server only)
R2_BUCKET_NAME           R2 bucket name

TELEGRAM_BOT_TOKEN       Bot token (webhook verify)
TELEGRAM_CHAT_ID         Allowed chat ID
TELEGRAM_ALLOWED_USER_IDS Comma-separated allowed Telegram user IDs

ANTHROPIC_API_KEY        Claude API (server only + GitHub Actions)
```

## Restart Checklist
- [ ] `npm run dev` starts without error
- [ ] Supabase connection alive (`NEXT_PUBLIC_SUPABASE_URL` set)
- [ ] `.env.local` exists with all keys populated
- [ ] R2 keys NOT in any client-side code
- [ ] Telegram webhook URL registered: `https://<domain>/api/telegram/webhook`

## CRITICAL
- Next.js 16 uses `src/proxy.ts` with `export default async function proxy()`. This is the correct convention for Next.js 16. Do NOT use `middleware.ts` — it is deprecated in Next.js 16. Never change this.

## Git Policy
After each Task is fully complete and all completion criteria verified:
1. git add . (never include .env.local or any secret files)
2. git commit -m "Task [N] complete: [Task name]"
   Examples:
   - "Task 3 complete: Public Pages UI"
   - "Task 4 complete: Private Diary Page"
3. git push origin main

Task number and name must be taken directly from the Task prompt header.

Never push if:
- Build has errors
- .env.local or secret files are staged
- Task completion criteria are not fully met

## Hard Rules
- NEVER commit `.env.local` or any file containing secrets
- NEVER expose R2 credentials to client
- NEVER default failed Telegram parse to public — always `status = pending`
- NEVER publish without Shine's explicit approval
- Private content = Supabase only, zero Git involvement

## Tech Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth + RLS
- Cloudflare R2 (Sharp for image processing)
- Vercel Hobby (deployment)
- Telegram Bot (webhook)
- GitHub Actions (batch automation)
