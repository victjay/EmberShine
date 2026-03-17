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
  translationStatus?: 'translated' | 'failed' | 'missing'
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
    return { ...(data as PostMeta), slug, section, content, hasTranslation: true, locale: 'en' }
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

export async function getAllPosts(section: string, locale?: Locale): Promise<Post[]> {
  const slugs = getPostSlugs(section)
  const posts = await Promise.all(slugs.map((slug) => getPostBySlug(section, slug, locale)))
  return posts
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}
