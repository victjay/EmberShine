import Link from 'next/link'

const SECTIONS = [
  {
    href: '/blog',
    label: 'Blog',
    desc: 'Tech notes, guides, and dev experiments.',
    mono: true,
  },
  {
    href: '/stories',
    label: 'Stories',
    desc: 'Travel, daily life, photos from the road.',
    mono: false,
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    desc: 'Projects built and shipped.',
    mono: true,
  },
]

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-navy-900 tracking-tight mb-3">
          EmberShine
        </h1>
        <p className="text-lg text-slate-500 max-w-xl">
          A personal space for tech writing, travel stories, and work.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, label, desc }) => (
          <Link key={href} href={href} className="group block">
            <div className="border border-slate-200 rounded-xl p-6 h-full hover:border-blue-400 hover:shadow-sm transition-all bg-white">
              <h2 className="text-lg font-semibold text-navy-900 group-hover:text-blue-600 transition-colors mb-2">
                {label}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
