import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

export default function BlogPage() {
  const posts = getAllPosts('blog')

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="text-xl font-semibold group-hover:underline">{post.title}</h2>
                <p className="text-sm text-gray-500">{post.date}</p>
                {post.description && (
                  <p className="text-gray-600 mt-1">{post.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
