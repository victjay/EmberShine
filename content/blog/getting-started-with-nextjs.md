---
title: "Getting Started with Next.js 16"
date: "2026-03-10"
description: "A practical guide to setting up a modern Next.js project with TypeScript, Tailwind, and Supabase."
tags: ["Next.js", "TypeScript", "Supabase"]
---

Next.js 16 brings significant improvements to the App Router. Here's how to get started.

## Project Setup

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
npm install @supabase/ssr @supabase/supabase-js
```

## File Structure

The App Router uses a directory-based routing system:

```
src/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── blog/
│       └── page.tsx    # /blog route
└── lib/
    └── supabase/
        └── server.ts   # Server-side client
```

## Server Components

Server Components run on the server and can directly access databases:

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('posts').select('*')
  return <ul>{data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## Conclusion

Next.js 16 with the App Router makes building full-stack apps straightforward. The combination of Server Components and Supabase RLS gives you security by default.
