import Link from 'next/link'
import LangToggle from './LangToggle'

const NAV_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/stories', label: 'Stories' },
  { href: '/portfolio', label: 'Portfolio' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm font-semibold text-navy-900 tracking-tight hover:text-blue-600 transition-colors"
        >
          EmberShine
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-slate-600 hover:text-navy-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <LangToggle />
      </div>
    </header>
  )
}
