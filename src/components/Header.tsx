'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LangToggle from './LangToggle'
import DiaryLink from './DiaryLink'
import InboxLink from './InboxLink'
import LoginLink from './LoginLink'

interface Props {
  lang?: string
}

export default function Header({ lang }: Props) {
  const pathname = usePathname()
  const locale = lang ?? (pathname.startsWith('/en') ? 'en' : 'ko')

  const navLinks = [
    { href: `/${locale}/blog`,      label: 'Blog'      },
    { href: `/${locale}/stories`,   label: 'Stories'   },
    { href: `/${locale}/portfolio`, label: 'Portfolio' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="font-mono text-sm font-semibold text-navy-900 tracking-tight hover:text-blue-600 transition-colors"
        >
          EmberShine
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-slate-600 hover:text-navy-900 transition-colors"
            >
              {label}
            </Link>
          ))}
          <DiaryLink />
          <InboxLink />
        </nav>

        <div className="flex items-center gap-4">
          <LoginLink />
          <LangToggle lang={locale} />
        </div>
      </div>
    </header>
  )
}
