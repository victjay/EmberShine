import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { Locale } from '@/lib/i18n/locale'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface PostMeta {
  slug: string
  section: string
  title: string
  date: string
  description?: string
  tags?: string[]
  // locale-aware fields
  hasTranslation?: boolean
  locale?: Locale
  translationStatus?: 'translated' | 'stale' | 'failed' | 'missing'
  translation_locked?: boolean
  [key: string]: unknown
}

export interface Post extends PostMeta {
  content: string
}

export function getPostSlugs(section: string): string[] {
  const dir = path.join(CONTENT_DIR, section)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.en.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

export async function getPostBySlug(
  section: string,
  slug: string,
  locale?: Locale,
): Promise<Post | null> {
  const basePath = path.join(CONTENT_DIR, section, `${slug}.md`)
  const enPath   = path.join(CONTENT_DIR, section, `${slug}.en.md`)

  if (locale === 'en' && fs.existsSync(enPath)) {
    const raw = fs.readFileSync(enPath, 'utf8')
    const { data, content } = matter(raw)
    const post: Post = { ...(data as PostMeta), slug, section, content, hasTranslation: true, locale: 'en' }

    if (post.translation_locked === true) {
      post.translationStatus = 'translated'
    } else {
      const src = post.source_updated_at as string | undefined
      const trn = post.translated_from_updated_at as string | undefined
      // YYYY-MM-DD 문자열 비교 = 날짜 비교와 동일하게 동작
      if (!src || !trn) post.translationStatus = 'missing'
      else if (src > trn) post.translationStatus = 'stale'
      else post.translationStatus = 'translated'
    }

    return post
  }

  // KO (default) or EN fallback when .en.md is missing
  if (!fs.existsSync(basePath)) return null
  const raw = fs.readFileSync(basePath, 'utf8')
  const { data, content } = matter(raw)
  return {
    ...(data as PostMeta),
    slug,
    section,
    content,
    hasTranslation: locale === 'en' ? false : undefined,
    locale: 'ko',
  }
}

function getPostDate(post: Post): number {
  const dateStr =
    post.date ??
    (post.source_updated_at as string | undefined) ??
    post.slug.match(/^\d{4}-\d{2}-\d{2}/)?.[0]

  if (!dateStr) return 0

  // UTC 고정 파싱 — 모든 환경에서 동일한 timestamp 보장
  const t = new Date(dateStr + 'T00:00:00Z').getTime()
  return isNaN(t) ? 0 : t
}

export async function getAllPosts(section: string, locale?: Locale): Promise<Post[]> {
  const slugs = getPostSlugs(section)
  const posts = await Promise.all(slugs.map((slug) => getPostBySlug(section, slug, locale)))
  return posts
    .filter((p): p is Post => p !== null)
    .sort((a, b) => getPostDate(b) - getPostDate(a))
}
