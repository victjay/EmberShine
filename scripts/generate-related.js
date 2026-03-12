'use strict'
// Prebuild: generate public/related-posts.json
// For each post, finds top 3 related posts using tag Jaccard similarity
// + content keyword overlap. Run automatically via "prebuild" in package.json.

const fs     = require('fs')
const path   = require('path')
const matter = require('gray-matter')

const CONTENT_DIR = path.join(__dirname, '../content')
const OUT_FILE    = path.join(__dirname, '../public/related-posts.json')

// ── Read all posts ──────────────────────────────────────────────────────────
const posts = []
for (const section of ['blog', 'stories']) {
  const dir = path.join(CONTENT_DIR, section)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const raw   = fs.readFileSync(path.join(dir, file), 'utf8')
    const { data, content } = matter(raw)
    posts.push({
      slug:    file.replace(/\.md$/, ''),
      section,
      title:   data.title   ?? '',
      date:    data.date    ?? '',
      tags:    data.tags    ?? [],
      excerpt: content.replace(/[#*`[\]()!]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300),
    })
  }
}

// ── Jaccard similarity on tags ──────────────────────────────────────────────
function jaccardTags(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a.map((t) => t.toLowerCase()))
  const setB = new Set(b.map((t) => t.toLowerCase()))
  let intersection = 0
  for (const t of setA) if (setB.has(t)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ── Word overlap on excerpt ─────────────────────────────────────────────────
function wordOverlap(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let overlap = 0
  for (const w of wordsA) if (wordsB.has(w)) overlap++
  return overlap / Math.max(wordsA.size, wordsB.size)
}

// ── Build related map ───────────────────────────────────────────────────────
const result = {}

for (const post of posts) {
  const key = `${post.section}/${post.slug}`

  const scored = posts
    .filter((p) => p.slug !== post.slug || p.section !== post.section)
    .map((other) => ({
      slug:    other.slug,
      section: other.section,
      title:   other.title,
      date:    other.date,
      tags:    other.tags,
      score:   jaccardTags(post.tags, other.tags) * 0.7 +
               wordOverlap(post.excerpt, other.excerpt) * 0.3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ slug, section, title, date, tags }) => ({ slug, section, title, date, tags }))

  result[key] = scored
}

fs.mkdirSync(path.join(__dirname, '../public'), { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8')
console.log(`[related-posts] ${posts.length} posts → ${OUT_FILE}`)
