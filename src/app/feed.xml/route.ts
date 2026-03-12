import { getAllPosts } from '@/lib/content/markdown'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://embershine.vercel.app'

function buildFeed(title: string, description: string, feedUrl: string, posts: ReturnType<typeof getAllPosts>) {
  const items = posts.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/${post.section ?? 'blog'}/${post.slug}</link>
      <guid>${BASE_URL}/${post.section ?? 'blog'}/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      ${post.description ? `<description><![CDATA[${post.description}]]></description>` : ''}
    </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${BASE_URL}</link>
    <description>${description}</description>
    <language>ko</language>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`
}

export async function GET() {
  const blog    = getAllPosts('blog').map((p) => ({ ...p, section: 'blog' }))
  const stories = getAllPosts('stories').map((p) => ({ ...p, section: 'stories' }))
  const all     = [...blog, ...stories].sort((a, b) => (a.date > b.date ? -1 : 1))

  const xml = buildFeed(
    'EmberShine',
    'Personal blog — tech writing, travel stories, and projects.',
    `${BASE_URL}/feed.xml`,
    all,
  )

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
