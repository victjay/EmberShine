'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFileExists, getFileContent, pushMultipleToGitHub, FileEntry } from '@/lib/github/push'
import { safeSlug, ensureUniquePostId } from '@/lib/content/slug-utils'
import { resolvePublicSlug } from '@/lib/drafts/resolvePublicSlug'
import { buildMarkdown } from '@/lib/content/builder'
import { buildEnMarkdown } from '@/lib/content/en-file'
import { translatePost } from '@/lib/ai/translate'
import { runCategorizeAI } from '@/lib/ai/categorize'
import { computeDraftStage } from '@/lib/drafts/computeDraftStage'
import type { CategorizeOutput } from '@/types'
import matter from 'gray-matter'
import crypto from 'crypto'

export async function markNotificationRead(id: string): Promise<void> {
  await assertAdmin()
  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('system_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/private/inbox')
}

export async function deleteInboxMessage(formData: FormData): Promise<void> {
  await assertAdmin()

  const id = formData.get('id') as string
  if (!id) return

  const supabase = createAdminClient()

  // 연결된 draft_posts 먼저 삭제
  await supabase.from('draft_posts').delete().eq('inbox_id', id)

  // inbox_messages 삭제
  const { error } = await supabase
    .from('inbox_messages')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[inbox] deleteInboxMessage failed:', error.message)
    throw error
  }

  revalidatePath('/private/inbox')
  redirect('/private/inbox?tab=messages')
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

export async function saveDraft(
  formData: FormData,
): Promise<{ error: string } | { newStage: string }> {
  await assertAdmin()

  const id          = formData.get('id') as string
  const rawTitle    = (formData.get('title') as string)?.trim() ?? ''
  const body        = (formData.get('body') as string) ?? ''
  const title       = rawTitle || '제목 없음'
  const description = (formData.get('description') as string)?.trim() ?? ''
  const tagsRaw     = (formData.get('tags') as string) ?? ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)

  if (!id) return { error: '잘못된 요청입니다.' }

  const supabase = createServiceClient()

  // 기존 draft의 frontmatter 조회 → category 읽기 + description/tags merge
  const { data: existing, error: fetchError } = await supabase
    .from('draft_posts')
    .select('frontmatter')
    .eq('id', id)
    .single()

  if (fetchError || !existing) return { error: 'Draft 조회 실패: ' + (fetchError?.message ?? '없음') }

  let category: string | null
  let updatedFm: Record<string, unknown>
  try {
    const fm = existing.frontmatter
    if (fm === null || fm === undefined) {
      category = null
      updatedFm = {}
    } else if (typeof fm !== 'object' || Array.isArray(fm)) {
      throw new Error('frontmatter가 예외 타입입니다. 보고 후 수정 필요.')
    } else {
      const fmObj = fm as Record<string, unknown>
      category = (fmObj.category as string | undefined) ?? null
      updatedFm = { ...fmObj }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'frontmatter 파싱 오류' }
  }

  updatedFm.description = description || null
  updatedFm.tags        = tags.length > 0 ? tags : null

  const newStage = computeDraftStage(rawTitle, body, category)

  const { error } = await supabase
    .from('draft_posts')
    .update({ title, body_markdown: body, draft_stage: newStage, frontmatter: updatedFm })
    .eq('id', id)

  if (error) return { error: '저장 실패: ' + error.message }

  revalidatePath(`/private/inbox/draft/${id}`)
  revalidatePath('/private/inbox')

  return { newStage }
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

// ────────────────────────────────────────────────────────────────
// Draft 카테고리 저장 (frontmatter.category + draft_stage 동시 업데이트)
// ────────────────────────────────────────────────────────────────

export async function saveDraftCategory(
  draftId: string,
  categoryName: string,
): Promise<{ error: string } | { newStage: string }> {
  await assertAdmin()

  if (!draftId || !categoryName.trim()) return { error: '잘못된 요청입니다.' }

  const supabase = createServiceClient()

  const { data: draft, error: fetchError } = await supabase
    .from('draft_posts')
    .select('title, body_markdown, frontmatter')
    .eq('id', draftId)
    .single()

  if (fetchError || !draft) {
    return { error: 'Draft 조회 실패: ' + (fetchError?.message ?? '없음') }
  }

  let mergedFm: Record<string, unknown>
  try {
    const fm = draft.frontmatter
    if (fm === null || fm === undefined) {
      mergedFm = {}
    } else if (typeof fm !== 'object' || Array.isArray(fm)) {
      throw new Error('frontmatter가 예외 타입입니다. 보고 후 수정 필요.')
    } else {
      mergedFm = { ...(fm as Record<string, unknown>) }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'frontmatter 파싱 오류' }
  }

  mergedFm.category = categoryName

  const newStage = computeDraftStage(draft.title ?? '', draft.body_markdown ?? '', categoryName)

  const { error: updateError } = await supabase
    .from('draft_posts')
    .update({ frontmatter: mergedFm, draft_stage: newStage })
    .eq('id', draftId)

  if (updateError) return { error: '저장 실패: ' + updateError.message }

  revalidatePath(`/private/inbox/draft/${draftId}`)
  revalidatePath('/private/inbox')

  return { newStage }
}

// ────────────────────────────────────────────────────────────────
// AI 카테고리 추천 (Phase 21)
// ────────────────────────────────────────────────────────────────

function sha(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
}

export async function getCategoryRecommendation(
  postId: string,
  force = false,
): Promise<CategorizeOutput | { error: string }> {
  await assertAdmin()

  const supabase      = createServiceClient()
  const adminSupabase = createAdminClient()

  const { data: draft } = await supabase
    .from('draft_posts')
    .select('id, section, title, body_markdown, frontmatter')
    .eq('id', postId)
    .single()

  if (!draft) return { error: 'Draft not found' }

  const { data: allCats } = await supabase
    .from('categories')
    .select('name, deleted_at')
    .eq('section', draft.section)

  const existingCategories = (allCats ?? []).filter((c) => !c.deleted_at).map((c) => c.name)
  const excludedCategories = (allCats ?? []).filter((c) =>  c.deleted_at).map((c) => c.name)

  const desc = ((draft.frontmatter as Record<string, unknown>)?.description as string) ?? ''

  const contentHash       = sha(draft.title + (draft.body_markdown ?? '').slice(0, 500) + desc)
  const categoriesVersion = sha([...existingCategories].sort().join(','))
  const excludedVersion   = sha([...excludedCategories].sort().join(','))

  if (!force) {
    const { data: cached } = await adminSupabase
      .from('ai_category_recommendations')
      .select('existing_top3, suggested_top3')
      .eq('post_id', postId)
      .eq('content_hash', contentHash)
      .eq('categories_version', categoriesVersion)
      .eq('excluded_version', excludedVersion)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      return {
        existing_top3: cached.existing_top3 as CategorizeOutput['existing_top3'],
        suggested_top3: cached.suggested_top3 as CategorizeOutput['suggested_top3'],
      }
    }
  }

  try {
    const result = await runCategorizeAI({
      title:              draft.title,
      body:               draft.body_markdown ?? '',
      description:        desc || null,
      section:            draft.section,
      existingCategories,
      excludedCategories,
    })

    await adminSupabase.from('ai_category_recommendations').insert({
      post_id:            postId,
      content_hash:       contentHash,
      categories_version: categoriesVersion,
      excluded_version:   excludedVersion,
      existing_top3:      result.existing_top3,
      suggested_top3:     result.suggested_top3,
    })

    return result
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'AI 분석 실패' }
  }
}

// ────────────────────────────────────────────────────────────────
// Draft 발행 (카테고리 선택 후 GitHub push)
// ────────────────────────────────────────────────────────────────

export async function applyAndPublish(
  draftId: string,
  categoryName: string,
  isNew: boolean,
): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const supabase      = createServiceClient()
  const adminSupabase = createAdminClient()

  const { data: draft } = await supabase
    .from('draft_posts')
    .select('id, section, title, body_markdown, frontmatter, created_at')
    .eq('id', draftId)
    .eq('status', 'draft')
    .single()

  if (!draft) return { error: 'Draft not found' }

  const fm          = (draft.frontmatter ?? {}) as Record<string, unknown>
  const description = (fm.description as string | null) ?? null
  const tags        = (fm.tags        as string[] | null) ?? []

  // 신규 카테고리 생성
  if (isNew) {
    const { error: catError } = await adminSupabase
      .from('categories')
      .insert({ name: categoryName, section: draft.section, deleted_at: null })
    if (catError && !catError.message.includes('duplicate')) {
      return { error: '카테고리 생성 실패: ' + catError.message }
    }
  }

  const today  = draft.created_at.split('T')[0]   // UTC 발행일 (draft 생성 시각 기준)
  const postId = resolvePublicSlug(draft)

  // EN 번역 시도 (실패해도 KO만 발행)
  let enContent: string | null = null
  try {
    const translation = await translatePost({
      title:       draft.title,
      description: description ?? undefined,
      body:        draft.body_markdown ?? '',
      fromLocale: 'ko',
      toLocale:   'en',
    })
    if (translation.success) {
      const enFm = {
        title: draft.title, date: today, category: categoryName,
        description, tags, source_updated_at: today, translated_from_updated_at: today,
      }
      enContent = buildEnMarkdown(enFm, translation.data)
    }
  } catch (e) {
    console.error('[translate] failed:', e)
  }

  const koFm      = { title: draft.title, date: today, category: categoryName, description, tags, source_updated_at: today }
  const koContent = buildMarkdown(koFm, draft.body_markdown ?? '')

  const files: FileEntry[] = [
    { path: `content/${draft.section}/${postId}.md`, content: koContent },
  ]
  if (enContent) {
    files.push({ path: `content/${draft.section}/${postId}.en.md`, content: enContent })
  }

  let commitSha: string
  try {
    const result = await pushMultipleToGitHub({
      files,
      message: `Create ${draft.section} post: ${postId}`,
    })
    commitSha = result.commitSha
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // draft 상태 published 로 전환 (frontmatter.category + draft_stage 동시 업데이트)
  const updatedFm = { ...fm, category: categoryName }
  await supabase
    .from('draft_posts')
    .update({
      status:      'published',
      github_path: postId,
      frontmatter: updatedFm,
      draft_stage: computeDraftStage(draft.title, draft.body_markdown ?? '', categoryName),
    })
    .eq('id', draftId)

  revalidatePath('/private/inbox')
  revalidatePath(`/ko/${draft.section}`)
  revalidatePath(`/en/${draft.section}`)

  // 배포 추적 (비차단)
  try {
    await adminSupabase.from('deployments').insert({
      commit_sha:   commitSha,
      post_id:      postId,
      post_section: draft.section,
      status:       'building',
    })
  } catch (e) {
    console.error('[deployment] tracking failed:', e)
  }

  redirect(`/private/inbox?saved=1&commit=${commitSha}`)
}

// ────────────────────────────────────────────────────────────────
// Draft 삭제
// ────────────────────────────────────────────────────────────────

export async function deleteDraft(draftId: string): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('draft_posts')
    .delete()
    .eq('id', draftId)
    .eq('status', 'draft')

  if (error) return { error: '삭제 실패: ' + error.message }

  revalidatePath('/private/inbox')
}

// ────────────────────────────────────────────────────────────────
// 편집 화면 발행 버튼 → categorizing 전환 (Step 5)
// ────────────────────────────────────────────────────────────────

export async function publishDraft(draftId: string): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const supabase = createServiceClient()

  const { data: draft } = await supabase
    .from('draft_posts')
    .select('id, title, body_markdown')
    .eq('id', draftId)
    .eq('status', 'draft')
    .single()

  if (!draft) return { error: 'Draft not found' }

  // 발행 validation (= 발행 버튼 활성화 조건과 동일)
  if (!draft.title.trim() || !draft.body_markdown?.trim()) {
    return { error: '제목과 본문을 입력해주세요.' }
  }

  // category 없음 → categorizing 전환 후 redirect
  await supabase
    .from('draft_posts')
    .update({ draft_stage: 'categorizing' })
    .eq('id', draftId)

  revalidatePath('/private/inbox')
  redirect('/private/inbox?tab=categorizing')
}

// ────────────────────────────────────────────────────────────────
// 발행된 포스트 카테고리 수정 (GitHub frontmatter re-push)
// ────────────────────────────────────────────────────────────────

export async function updatePublishedCategory(
  section: 'blog' | 'stories' | 'portfolio',
  slug: string,
  newCategory: string,
): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const koPath = `content/${section}/${slug}.md`
  const enPath = `content/${section}/${slug}.en.md`

  const koRaw = await getFileContent(koPath)
  if (!koRaw) return { error: '파일을 찾을 수 없습니다.' }

  const { data: koData, content: koBody } = matter(koRaw)
  koData.category = newCategory

  const files: FileEntry[] = [
    { path: koPath, content: matter.stringify(koBody, koData) },
  ]

  try {
    const enRaw = await getFileContent(enPath)
    if (enRaw) {
      const { data: enData, content: enBody } = matter(enRaw)
      enData.category = newCategory
      files.push({ path: enPath, content: matter.stringify(enBody, enData) })
    }
  } catch {
    // EN 처리 실패 시 KO만 진행
  }

  try {
    await pushMultipleToGitHub({ files, message: `Update category: ${slug} → ${newCategory}` })
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  revalidatePath(`/ko/${section}/${slug}`)
  revalidatePath(`/en/${section}/${slug}`)
  revalidatePath(`/ko/${section}`)
  revalidatePath(`/en/${section}`)
}
