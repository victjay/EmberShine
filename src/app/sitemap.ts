import type { MetadataRoute } from 'next'
import { getPostSlugs } from '@/lib/content/markdown'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const blogSlugs = getPostSlugs('blog').map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const storiesSlugs = getPostSlugs('stories').map((slug) => ({
    url: `${BASE_URL}/stories/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const portfolioSlugs = getPostSlugs('portfolio').map((slug) => ({
    url: `${BASE_URL}/portfolio/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/stories`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/portfolio`, changeFrequency: 'monthly', priority: 0.8 },
    ...blogSlugs,
    ...storiesSlugs,
    ...portfolioSlugs,
    // /private/* intentionally excluded
  ]
}
