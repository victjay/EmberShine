import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isValidLocale } from '@/lib/i18n/locale'
import { getDictionary } from '../../../messages'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params

  if (!isValidLocale(lang)) notFound()

  const d = await getDictionary(lang)

  const sections = [
    { href: `/${lang}/blog`,      label: 'Blog',      desc: d.home.blog      },
    { href: `/${lang}/stories`,   label: 'Stories',   desc: d.home.stories   },
    { href: `/${lang}/portfolio`, label: 'Portfolio', desc: d.home.portfolio  },
  ]

  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-navy-900 tracking-tight mb-3">
          EmberShine
        </h1>
        <p className="text-lg text-slate-500 max-w-xl">
          {d.home.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map(({ href, label, desc }) => (
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
