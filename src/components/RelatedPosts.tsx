import fs   from 'fs'
import path from 'path'
import Link from 'next/link'

interface RelatedPost {
  slug:    string
  section: string
  title:   string
  date:    string
  tags:    string[]
}

interface RelatedMap {
  [key: string]: RelatedPost[]
}

export default function RelatedPosts({ slug, section }: { slug: string; section: string }) {
  let related: RelatedPost[] = []
  try {
    const filePath = path.join(process.cwd(), 'public', 'related-posts.json')
    const map      = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RelatedMap
    related        = map[`${section}/${slug}`] ?? []
  } catch {
    return null
  }

  if (related.length === 0) return null

  return (
    <section className="mt-14 pt-10 border-t border-slate-100">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider font-mono mb-5">
        관련 글
      </h3>
      <ul className="flex flex-col gap-3">
        {related.map((post) => (
          <li key={`${post.section}/${post.slug}`}>
            <Link
              href={`/${post.section}/${post.slug}`}
              className="group flex items-start justify-between gap-4 p-4 border border-slate-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {post.title}
                </p>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <time className="shrink-0 text-xs font-mono text-slate-400 pt-0.5">
                {post.date}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
