'use client'
import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import SubmitButton from '@/components/SubmitButton'
import { createClient } from '@/lib/supabase/client'

interface Props {
  postId: string
  section: string
  title?: string
  requestDeleteAction: (
    state: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | void>
}

export default function DeleteButton({ postId, section, title, requestDeleteAction }: Props) {
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
  const [showModal, setShowModal] = useState(false)

  if (!isAdmin) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
      >
        삭제
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-900">포스트 삭제</h2>
            <p className="text-sm text-slate-700">
              {title
                ? <><span className="font-medium">&lsquo;{title}&rsquo;</span>을 삭제합니다.</>
                : '이 포스트를 삭제합니다.'
              }
            </p>
            <ul className="text-sm text-slate-500 space-y-1">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                GitHub에서 파일이 제거됩니다
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                Vercel에서 해당 URL이 사라집니다
              </li>
            </ul>
            {state?.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}
            <form action={formAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="section" value={section} />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  취소
                </button>
                <SubmitButton
                  label="삭제"
                  loadingLabel="처리 중..."
                  className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
