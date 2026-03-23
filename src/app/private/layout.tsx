import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import '@/app/globals.css'

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
    <html lang="ko">
      <body className="antialiased">
        <div className="min-h-screen bg-slate-50">
          <Header lang="ko" />
          <div className="max-w-2xl mx-auto px-6 py-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
