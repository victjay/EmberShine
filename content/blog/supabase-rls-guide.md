---
title: "Supabase RLS: Row-Level Security in Practice"
date: "2026-03-05"
description: "How to lock down your Supabase tables so users can only access their own data."
tags: ["Supabase", "Security", "PostgreSQL"]
---

Row-Level Security (RLS) is Postgres's built-in mechanism for per-row access control.

## Enable RLS

Always enable RLS on every table. Without it, anyone with the anon key can read all rows.

```sql
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
```

## Owner-Only Policy

```sql
CREATE POLICY "Owner reads own diary"
  ON diary_entries FOR SELECT
  USING (auth.uid() = owner_id);
```

The `auth.uid()` function returns the UUID of the currently authenticated user.

## Service Role Bypass

The service role key bypasses all RLS policies — never expose it to the client.

```typescript
// Server-only — never import in client components
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // secret!
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

## Testing RLS

Use the Supabase dashboard's Table Editor with different roles to verify policies work correctly.
