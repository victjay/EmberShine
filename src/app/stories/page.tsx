import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

export default function StoriesPage() {
  const posts = getAllPosts('stories')

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Stories</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">No stories yet.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/stories/${post.slug}`} className="group">
                <h2 className="text-xl font-semibold group-hover:underline">{post.title}</h2>
                <p className="text-sm text-gray-500">{post.date}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
