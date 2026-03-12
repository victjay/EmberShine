---
title: "EmberShine Blog"
date: "2026-03-01"
description: "A personal blog platform built with Next.js 16, Supabase, Cloudflare R2, and a Telegram-based content pipeline."
tags: ["Next.js", "TypeScript", "Supabase", "Cloudflare R2", "Telegram"]
github: "https://github.com/victjay/EmberShine"
status: "In Progress"
---

## Overview

EmberShine is a personal publishing platform built for a single-owner workflow. Content enters via Telegram, gets reviewed privately, and publishes to GitHub-backed markdown pages.

## Architecture

- **Public content** — Markdown files in GitHub, served via Next.js static generation
- **Private content** — Supabase with RLS, never touches Git
- **Media** — Cloudflare R2, EXIF-stripped before upload
- **Content pipeline** — Telegram webhook → inbox → Claude draft → approve → publish

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Media | Cloudflare R2 + Sharp |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel Hobby |
| Pipeline | Telegram Bot + GitHub Actions |

## Key Features

- Row-level security on all tables
- Telegram-to-blog content pipeline
- Private diary with owner-only access
- Automatic EXIF stripping on image upload
- AI-assisted draft generation via Claude API

## Status

Currently in active development. Tasks 1–3 complete.
