'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function LoginLink() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoggedIn === null) return null

  if (isLoggedIn) {
    return (
      <button
        onClick={async () => {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          )
          await supabase.auth.signOut()
          window.location.reload()
        }}
        className="text-xs font-mono border border-slate-200 rounded px-1 py-0.5 text-slate-500 hover:text-slate-800 transition-colors"
      >
        Log out
      </button>
    )
  }

  return (
    <Link
      href="/login"
      className="text-xs font-mono border border-slate-200 rounded px-1 py-0.5 text-slate-500 hover:text-slate-800 transition-colors"
    >
      Login
    </Link>
  )
}
