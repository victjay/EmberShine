import fs   from 'fs'
import path from 'path'
import RelatedPostsList from './RelatedPostsList'

interface RelatedPost {
  slug:    string
  section: string
  title:   string
  date:    string
  tags:    string[]
}

export default function RelatedPosts({ slug, section }: { slug: string; section: string }) {
  let related: RelatedPost[] = []
  try {
    const filePath = path.join(process.cwd(), 'public', 'related-posts.json')
    const map      = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, RelatedPost[]>
    related        = map[`${section}/${slug}`] ?? []
  } catch {
    return null
  }

  if (related.length === 0) return null

  return <RelatedPostsList posts={related} />
}
