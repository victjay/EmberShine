'use server'

import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/admin'
import { safeSlug, ensureUniquePostId } from '@/lib/content/slug-utils'
import { buildMarkdown } from '@/lib/content/builder'
import { pushMultipleToGitHub, FileEntry } from '@/lib/github/push'
import { translatePost } from '@/lib/ai/translate'
import { buildEnMarkdown } from '@/lib/content/en-file'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createStory(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const title         = (formData.get('title') as string | null)?.trim() ?? ''
  const body          = (formData.get('body') as string | null) ?? ''
  const date          = (formData.get('date') as string | null) ?? ''
  const description   = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw       = (formData.get('tags') as string | null) ?? ''
  const tags          = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const location      = (formData.get('location') as string | null)?.trim() || null
  const shootingDate  = (formData.get('shooting_date') as string | null)?.trim() || null

  if (!title) return { error: '제목을 입력해주세요.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  let postId: string
  try {
    postId = await ensureUniquePostId('stories', `${date}-${slug}`)
  } catch {
    return { error: '게시물 ID 생성 실패' }
  }

  // ※ today를 한 번만 생성 — KO/EN 모두 동일 기준값 사용 (stale 판단 정확도 보장)
  const today = new Date().toISOString().split('T')[0]

  // 1. 번역 먼저 시도
  let enContent: string | null = null
  try {
    const translation = await translatePost({
      title,
      description: description ?? undefined,
      body,
      fromLocale: 'ko',
      toLocale: 'en',
    })
    if (translation.success) {
      const enFrontmatter = {
        title, date, description, tags,
        ...(location     ? { location }                    : {}),
        ...(shootingDate ? { shooting_date: shootingDate } : {}),
        source_updated_at: today,
        translated_from_updated_at: today,
      }
      enContent = buildEnMarkdown(enFrontmatter, translation.data)
    }
  } catch (e) {
    console.error('[translate] failed:', e)
  }

  // 2. KO 콘텐츠 구성 (source_updated_at 반드시 포함)
  const koFrontmatter = {
    title, date,
    ...(description   ? { description }                    : {}),
    ...(tags.length > 0 ? { tags }                         : {}),
    ...(location      ? { location }                       : {}),
    ...(shootingDate  ? { shooting_date: shootingDate }    : {}),
    source_updated_at: today,
  }
  const koContent = buildMarkdown(koFrontmatter, body)

  // 3. 파일 목록 구성
  const files: FileEntry[] = [
    { path: `content/stories/${postId}.md`, content: koContent },
  ]
  if (enContent) {
    files.push({ path: `content/stories/${postId}.en.md`, content: enContent })
  }

  // 4. 단일 commit push
  let commitSha: string
  try {
    const result = await pushMultipleToGitHub({
      files,
      message: `Create story: ${postId}`,
    })
    commitSha = result.commitSha
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // 5. deployments 기록 (비차단)
  try {
    const supabase = createAdminClient()
    await supabase.from('deployments').insert({
      commit_sha: commitSha,
      post_id: postId,
      post_section: 'stories',
      status: 'building',
    })
  } catch (e) {
    console.error('[deployment] tracking failed:', e)
  }

  // 6. redirect
  redirect(`/private/inbox?saved=1&commit=${commitSha}`)
}

export async function updateStory(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const postId        = (formData.get('postId') as string | null)?.trim() ?? ''
  const title         = (formData.get('title') as string | null)?.trim() ?? ''
  const body          = (formData.get('body') as string | null) ?? ''
  const date          = (formData.get('date') as string | null) ?? ''
  const description   = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw       = (formData.get('tags') as string | null) ?? ''
  const tags          = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const location      = (formData.get('location') as string | null)?.trim() || null
  const shootingDate  = (formData.get('shooting_date') as string | null)?.trim() || null

  if (!title)  return { error: '제목을 입력해주세요.' }
  if (!postId) return { error: '게시물 ID가 없습니다.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  // ※ today를 한 번만 생성 — KO/EN 모두 동일 기준값 사용 (stale 판단 정확도 보장)
  const today = new Date().toISOString().split('T')[0]

  // 1. 번역 먼저 시도
  let enContent: string | null = null
  try {
    const translation = await translatePost({
      title,
      description: description ?? undefined,
      body,
      fromLocale: 'ko',
      toLocale: 'en',
    })
    if (translation.success) {
      const enFrontmatter = {
        title, date, description, tags,
        ...(location     ? { location }                    : {}),
        ...(shootingDate ? { shooting_date: shootingDate } : {}),
        source_updated_at: today,
        translated_from_updated_at: today,
      }
      enContent = buildEnMarkdown(enFrontmatter, translation.data)
    }
  } catch (e) {
    console.error('[translate] failed:', e)
  }

  // 2. KO 콘텐츠 구성
  const koFrontmatter = {
    title, date,
    ...(description   ? { description }                    : {}),
    ...(tags.length > 0 ? { tags }                         : {}),
    ...(location      ? { location }                       : {}),
    ...(shootingDate  ? { shooting_date: shootingDate }    : {}),
    updatedAt: today,
    source_updated_at: today,
  }
  const koContent = buildMarkdown(koFrontmatter, body)

  // 3. 파일 목록 구성
  // 번역 실패 시 기존 .en.md 유지 (files에 EN 미포함 → stale 배지 표시)
  const files: FileEntry[] = [
    { path: `content/stories/${postId}.md`, content: koContent },
  ]
  if (enContent) {
    files.push({ path: `content/stories/${postId}.en.md`, content: enContent })
  }

  // 4. 단일 commit push
  let commitSha: string
  try {
    const result = await pushMultipleToGitHub({
      files,
      message: `Update story: ${postId}`,
    })
    commitSha = result.commitSha
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // 5. deployments 기록 (비차단)
  try {
    const supabase = createAdminClient()
    await supabase.from('deployments').insert({
      commit_sha: commitSha,
      post_id: postId,
      post_section: 'stories',
      status: 'building',
    })
  } catch (e) {
    console.error('[deployment] tracking failed:', e)
  }

  // 6. redirect
  redirect(`/private/inbox?saved=1&commit=${commitSha}`)
}
