import { getAllPosts } from '@/lib/content/markdown'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

export async function GET() {
  const posts = getAllPosts('blog')

  const items = posts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid>${BASE_URL}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.description ? `<description><![CDATA[${post.description}]]></description>` : ''}
      ${(post.tags ?? []).map((t) => `<category>${t}</category>`).join('')}
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EmberShine — Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Tech notes, guides, and experiments.</description>
    <language>ko</language>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
