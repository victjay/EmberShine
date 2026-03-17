'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  newHref: string
  editHref?: string
}

export default function SectionControls({ newHref, editHref }: Props) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setIsAdmin(true)
      }
    })
  }, [])

  if (!isAdmin) return null

  return (
    <div className="flex gap-2">
      {editHref && (
        <Link
          href={editHref}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Edit
        </Link>
      )}
      <Link
        href={newHref}
        className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        + New
      </Link>
    </div>
  )
}
