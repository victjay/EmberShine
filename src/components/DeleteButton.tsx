'use client'
import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import SubmitButton from '@/components/SubmitButton'
import { createClient } from '@/lib/supabase/client'

interface Props {
  postId: string
  section: string
  requestDeleteAction: (
    state: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | void>
}

export default function DeleteButton({ postId, section, requestDeleteAction }: Props) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setIsAdmin(true)
      }
    })
  }, [])

  const [state, formAction] = useActionState<
    { error?: string } | null,
    FormData
  >(
    requestDeleteAction as (
      state: { error?: string } | null,
      formData: FormData
    ) => Promise<{ error?: string } | null>,
    null
  )
  const [confirmed, setConfirmed] = useState(false)

  if (!isAdmin) return null

  return (
    <form action={formAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="section" value={section} />
      {!confirmed ? (
        <button type="button" onClick={() => setConfirmed(true)}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
          삭제
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600">정말 삭제하시겠습니까?</span>
          <SubmitButton label="삭제 요청" loadingLabel="처리 중..."
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg" />
          <button type="button" onClick={() => setConfirmed(false)}
            className="px-3 py-1.5 text-sm text-slate-600">취소</button>
        </div>
      )}
      {state?.error && <p className="text-red-500 text-sm mt-1">{state.error}</p>}
    </form>
  )
}
