// Build a markdown file (frontmatter + body) ready for GitHub push.
// Separate from markdown.ts which reads existing content files.

export interface MarkdownBuildInput {
  title: string
  date: string                              // YYYY-MM-DD
  summary: string
  tags: string[]
  imageUrl: string | null
  imageAlt: string | null
  metaDescription: string
  section: 'blog' | 'stories' | 'portfolio'
  shootingDate: string | null               // YYYY-MM-DD, from EXIF (no GPS)
  cameraModel: string | null
  slug: string                              // URL-safe, e.g. 2026-03-12-a903141b
  body: string                              // AI-generated markdown body
}

export function buildMarkdown(input: MarkdownBuildInput): {
  content: string
  path: string   // e.g. content/blog/2026-03-12-a903141b.md
} {
  const fm: string[] = ['---']

  fm.push(`title: ${JSON.stringify(input.title)}`)
  fm.push(`date: "${input.date}"`)
  fm.push(`description: ${JSON.stringify(input.metaDescription || input.summary)}`)

  if (input.tags.length > 0) {
    const clean = input.tags.map((t) => t.replace(/^#/, ''))
    fm.push(`tags: [${clean.map((t) => JSON.stringify(t)).join(', ')}]`)
  }

  if (input.imageUrl) {
    fm.push(`image: "${input.imageUrl}"`)
    if (input.imageAlt) fm.push(`alt: ${JSON.stringify(input.imageAlt)}`)
  }

  if (input.shootingDate) fm.push(`shooting_date: "${input.shootingDate.slice(0, 10)}"`)
  if (input.cameraModel)  fm.push(`camera: ${JSON.stringify(input.cameraModel)}`)

  fm.push('---')
  fm.push('')

  // Hero image at top of body if present
  const bodyParts: string[] = []
  if (input.imageUrl && input.imageAlt) {
    bodyParts.push(`![${input.imageAlt}](${input.imageUrl})`)
    bodyParts.push('')
  }
  bodyParts.push(input.body)

  const content = [...fm, ...bodyParts].join('\n')
  const path    = `content/${input.section}/${input.slug}.md`

  return { content, path }
}
