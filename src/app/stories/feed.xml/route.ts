import { getAllPosts } from '@/lib/content/markdown'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

export async function GET() {
  const posts = getAllPosts('stories')

  const items = posts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/stories/${post.slug}</link>
      <guid>${BASE_URL}/stories/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.description ? `<description><![CDATA[${post.description}]]></description>` : ''}
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EmberShine — Stories</title>
    <link>${BASE_URL}/stories</link>
    <description>Travel, daily life, and things worth remembering.</description>
    <language>ko</language>
    <atom:link href="${BASE_URL}/stories/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
