import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n/locale'
import RootShell from '@/components/RootShell'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import '@/app/globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'EmberShine',
    template: '%s · EmberShine',
  },
  description: 'Personal blog — tech writing, travel stories, and projects.',
  openGraph: {
    title: 'EmberShine',
    description: 'Personal blog — tech writing, travel stories, and projects.',
    url: BASE_URL,
    siteName: 'EmberShine',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EmberShine',
    description: 'Personal blog — tech writing, travel stories, and projects.',
  },
  alternates: {
    canonical: BASE_URL,
    types: {
      'application/rss+xml': [
        { url: '/feed.xml',         title: 'EmberShine' },
        { url: '/blog/feed.xml',    title: 'EmberShine — Blog' },
        { url: '/stories/feed.xml', title: 'EmberShine — Stories' },
      ],
    },
  },
}

export function generateStaticParams() {
  return [{ lang: 'ko' }, { lang: 'en' }]
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!isValidLocale(lang)) {
    notFound()
  }

  return (
    <html lang={lang}>
      <head>
        {/* Cloudflare Web Analytics */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "6e1718e348f64fed8e73e9423ccb4d04"}'
        />
      </head>
      <body className="antialiased">
        <RootShell>
          <Header lang={lang} />
          {children}
          <Footer />
        </RootShell>
      </body>
    </html>
  )
}
