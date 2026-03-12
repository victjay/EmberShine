import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

// Auth check is enforced by middleware.ts — this layout is only reached when authenticated
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <a href="/private/diary" className="text-gray-700 hover:text-gray-900 font-medium">Diary</a>
            <a href="/private/inbox" className="text-gray-700 hover:text-gray-900 font-medium">Inbox</a>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <div className="max-w-2xl mx-auto p-8">
        {children}
      </div>
    </div>
  )
}
