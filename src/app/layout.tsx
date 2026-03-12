import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

const BASE_URL         = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
