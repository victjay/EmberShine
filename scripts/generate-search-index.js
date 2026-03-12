'use strict'
// Prebuild: generate public/search-index.json from all blog + stories markdown.
// Private content is never included. Run automatically via "prebuild" in package.json.

const fs     = require('fs')
const path   = require('path')
const matter = require('gray-matter')

const CONTENT_DIR = path.join(__dirname, '../content')
const OUT_FILE    = path.join(__dirname, '../public/search-index.json')

const index = []

for (const section of ['blog', 'stories']) {
  const dir = path.join(CONTENT_DIR, section)
  if (!fs.existsSync(dir)) continue

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const raw   = fs.readFileSync(path.join(dir, file), 'utf8')
    const { data, content } = matter(raw)
    const slug  = file.replace(/\.md$/, '')
    const excerpt = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // strip images
      .replace(/#{1,6}\s/g, '')        // strip headings
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200)

    index.push({
      slug,
      section,
      title:       data.title       ?? '',
      date:        data.date        ?? '',
      description: data.description ?? data.summary ?? '',
      tags:        data.tags        ?? [],
      excerpt,
    })
  }
}

// Sort newest first
index.sort((a, b) => (a.date > b.date ? -1 : 1))

fs.mkdirSync(path.join(__dirname, '../public'), { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2), 'utf8')
console.log(`[search-index] ${index.length} entries written to public/search-index.json`)
