export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Shine&apos;s Blog</h1>
        <p className="text-lg text-gray-600">
          A personal space for thoughts, stories, and work.
        </p>
        <nav className="flex flex-wrap justify-center gap-4 pt-4">
          <a href="/blog" className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors">
            Blog
          </a>
          <a href="/stories" className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            Stories
          </a>
          <a href="/portfolio" className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            Portfolio
          </a>
        </nav>
        <p className="text-xs text-gray-400 pt-8">
          Next.js App Router · Supabase · Cloudflare R2 · Tailwind CSS
        </p>
      </div>
    </main>
  )
}
