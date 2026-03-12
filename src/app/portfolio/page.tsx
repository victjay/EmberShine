import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Projects built and shipped.',
  alternates: { canonical: '/portfolio' },
  openGraph: { title: 'Portfolio · EmberShine', url: '/portfolio' },
}

const SKILLS = [
  { category: 'Languages', items: ['TypeScript', 'Python', 'SQL', 'Bash'] },
  { category: 'Frontend', items: ['Next.js', 'React', 'Tailwind CSS'] },
  { category: 'Backend', items: ['Node.js', 'PostgreSQL', 'Supabase'] },
  { category: 'Infra', items: ['Vercel', 'Cloudflare R2', 'GitHub Actions'] },
]

export default function PortfolioPage() {
  const projects = getAllPosts('portfolio')

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-navy-900 mb-1">Portfolio</h1>
        <p className="text-slate-500 text-sm">Projects I've built and things I've shipped.</p>
      </div>

      {/* Projects */}
      <section className="mb-16">
        <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-5">
          Projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-slate-500 text-sm">No projects yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {projects.map((post) => (
              <li key={post.slug}>
                <Link href={`/portfolio/${post.slug}`} className="group block">
                  <article className="border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-sm transition-all bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h2 className="text-lg font-semibold text-navy-900 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h2>
                          {post.status != null && (
                            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                              post.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : 'bg-green-50 text-green-700 border-green-100'
                            }`}>
                              {String(post.status)}
                            </span>
                          )}
                        </div>
                        {post.description && (
                          <p className="text-sm text-slate-500 leading-relaxed mb-3">
                            {post.description}
                          </p>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <time className="shrink-0 font-mono text-xs text-slate-400 pt-0.5">
                        {post.date}
                      </time>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Skills */}
      <section>
        <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-5">
          Skills & Experience
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SKILLS.map(({ category, items }) => (
            <div key={category} className="border border-slate-200 rounded-xl p-4 bg-white">
              <h3 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <li key={item} className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
