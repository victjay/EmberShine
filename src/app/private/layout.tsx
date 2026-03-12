import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

// Block all search engine indexing for /private/*
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Auth check is enforced by proxy.ts — this layout is only reached when authenticated
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex gap-5 text-sm">
            <a href="/private/diary" className="text-slate-700 hover:text-slate-900 font-medium">Diary</a>
            <a href="/private/inbox" className="text-slate-700 hover:text-slate-900 font-medium">Inbox</a>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  )
}
