import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface PostMeta {
  slug: string
  section: string
  title: string
  date: string
  description?: string
  tags?: string[]
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
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

export function getPostBySlug(section: string, slug: string): Post | null {
  const filePath = path.join(CONTENT_DIR, section, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  return { ...(data as PostMeta), slug, section, content }
}

export function getAllPosts(section: string): Post[] {
  return getPostSlugs(section)
    .map((slug) => getPostBySlug(section, slug))
    .filter((p): p is Post => p !== null)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}
