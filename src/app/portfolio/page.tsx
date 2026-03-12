import { getAllPosts } from '@/lib/content/markdown'
import Link from 'next/link'

export default function PortfolioPage() {
  const posts = getAllPosts('portfolio')

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Portfolio</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">No projects yet.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/portfolio/${post.slug}`} className="group">
                <h2 className="text-xl font-semibold group-hover:underline">{post.title}</h2>
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
