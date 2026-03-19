'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFileExists, getFileContent, pushMultipleToGitHub, FileEntry } from '@/lib/github/push'
import matter from 'gray-matter'

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

    revalidatePath('/private/inbox')

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

export async function saveDraft(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const id    = formData.get('id') as string
  const title = (formData.get('title') as string)?.trim() || '제목 없음'
  const body  = (formData.get('body') as string) ?? ''

  if (!id) return { error: '잘못된 요청입니다.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('draft_posts')
    .update({ title, body_markdown: body })
    .eq('id', id)

  if (error) return { error: '저장 실패: ' + error.message }

  revalidatePath(`/private/inbox/draft/${id}`)
}

export async function createDraftPost(
  section: 'blog' | 'stories' | 'portfolio'
): Promise<{ id: string } | { error: string }> {
  await assertAdmin()

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('draft_posts')
    .insert({
      section,
      title: '제목 없음',
      body_markdown: '',
      status: 'draft',
      draft_stage: 'writing',
      inbox_id: null,
      github_path: null,
      frontmatter: null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'draft 생성 실패: ' + (error?.message ?? '알 수 없는 오류') }
  }

  return { id: data.id }
}

export async function cancelDeletePost(jobId: string) {
  await assertAdmin()

  const adminSupabase = createAdminClient()

  // 1. admin_jobs에서 target_section, target_slug 조회
  const { data: job } = await adminSupabase
    .from('admin_jobs')
    .select('target_section, target_slug')
    .eq('id', jobId)
    .eq('status', 'pending')
    .single()

  if (job) {
    const { target_section: section, target_slug: slug } = job
    const koPath = `content/${section}/${slug}.md`
    const enPath = `content/${section}/${slug}.en.md`

    // 2. GitHub .md 읽기 → pending_delete 제거
    const koRaw = await getFileContent(koPath)
    if (koRaw) {
      const { data: koData, content: koBody } = matter(koRaw)
      delete koData.pending_delete
      const files: FileEntry[] = [{ path: koPath, content: matter.stringify(koBody, koData) }]

      // 3. .en.md 존재 시 동일하게 처리
      try {
        const enRaw = await getFileContent(enPath)
        if (enRaw) {
          const { data: enData, content: enBody } = matter(enRaw)
          delete enData.pending_delete
          files.push({ path: enPath, content: matter.stringify(enBody, enData) })
        }
      } catch {
        // EN 처리 실패 시 KO만 진행
      }

      // 4. 단일 commit push
      await pushMultipleToGitHub({ files, message: `Cancel pending delete: ${slug}` })
    }
  }

  // 5. admin_jobs status → 'canceled'
  await adminSupabase
    .from('admin_jobs')
    .update({ status: 'canceled' })
    .eq('id', jobId)

  // 6. revalidatePath
  revalidatePath('/private/inbox')
}
