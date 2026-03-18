'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFileExists, pushMultipleToGitHub } from '@/lib/github/push'

export async function deleteInboxMessage(formData: FormData): Promise<void> {
  await assertAdmin()

  const id = formData.get('id') as string
  if (!id) return

  const supabase = createServiceClient()

  // 연결된 draft_posts 먼저 삭제
  await supabase.from('draft_posts').delete().eq('inbox_id', id)

  // inbox_messages 삭제
  const { error } = await supabase
    .from('inbox_messages')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[inbox] deleteInboxMessage failed:', error.message)
    return
  }

  revalidatePath('/private/inbox')
}

export async function executeDeletePost(jobId: string) {
  await assertAdmin()

  const adminSupabase = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await adminSupabase
    .from('admin_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'pending')
    .single()

  if (!job) return { error: '삭제 요청을 찾을 수 없습니다.' }

  await adminSupabase
    .from('admin_jobs')
    .update({ status: 'executing', approved_by: user?.email })
    .eq('id', jobId)

  try {
    const { target_section: section, target_slug: slug } = job
    const koPath = `content/${section}/${slug}.md`
    const enPath = `content/${section}/${slug}.en.md`

    // 존재 확인 후 삭제 목록 구성
    // (없는 path에 sha: null 보내면 422 → checkFileExists 선행 필수)
    const files: { path: string; delete: boolean }[] = []
    if (await checkFileExists(koPath)) files.push({ path: koPath, delete: true })
    if (await checkFileExists(enPath)) files.push({ path: enPath, delete: true })

    if (files.length === 0) throw new Error('삭제할 파일을 찾을 수 없습니다.')

    await pushMultipleToGitHub({ files, message: `Delete post: ${slug}` })

    await adminSupabase
      .from('admin_jobs')
      .update({ status: 'done', executed_at: new Date().toISOString() })
      .eq('id', jobId)

  } catch (e) {
    await adminSupabase
      .from('admin_jobs')
      .update({
        status: 'failed',
        error_message: e instanceof Error ? e.message : '알 수 없는 오류',
      })
      .eq('id', jobId)

    return { error: '삭제 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류') }
  }
}

export async function cancelDeletePost(jobId: string) {
  await assertAdmin()

  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('admin_jobs')
    .update({ status: 'canceled' })
    .eq('id', jobId)
    .eq('status', 'pending')

  revalidatePath('/private/inbox')
}
