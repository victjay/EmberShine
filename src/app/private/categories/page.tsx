import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllPosts } from '@/lib/content/markdown'
import CategoryManager from './CategoryManager'

const SECTIONS = ['blog', 'stories', 'portfolio'] as const

export default async function CategoriesPage() {
  const adminSupabase = createAdminClient()

  const { data: categories } = await adminSupabase
    .from('categories')
    .select('id, name, section, deleted_at, created_at')
    .is('deleted_at', null)
    .order('name')

  const countMap: Record<string, number> = {}
  for (const section of SECTIONS) {
    const posts = await getAllPosts(section)
    for (const post of posts) {
      const cat = post.category as string | undefined
      if (cat) {
        const key = `${section}:${cat}`
        countMap[key] = (countMap[key] ?? 0) + 1
      }
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/private/inbox"
          className="text-sm text-slate-400 hover:text-slate-700 font-mono transition-colors"
        >
          ← Workspace
        </Link>
        <span className="text-slate-200">/</span>
        <span className="text-sm text-slate-500">카테고리 관리</span>
      </div>

      <h1 className="text-3xl font-bold mb-8">카테고리 관리</h1>

      <CategoryManager categories={categories ?? []} countMap={countMap} />
    </main>
  )
}
