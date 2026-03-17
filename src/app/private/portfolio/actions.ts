'use server'

import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/admin'
import { safeSlug, ensureUniquePostId } from '@/lib/content/slug-utils'
import { buildMarkdown } from '@/lib/content/builder'
import { pushToGitHub, deleteFromGitHub } from '@/lib/github/push'
import { translatePost } from '@/lib/ai/translate'
import { buildEnMarkdown } from '@/lib/content/en-file'

export async function createProject(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const title       = (formData.get('title') as string | null)?.trim() ?? ''
  const body        = (formData.get('body') as string | null) ?? ''
  const date        = (formData.get('date') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw     = (formData.get('tags') as string | null) ?? ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const status      = (formData.get('status') as string | null)?.trim() || 'Shipped'

  if (!title) return { error: '제목을 입력해주세요.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  let postId: string
  try {
    postId = await ensureUniquePostId('portfolio', `${date}-${slug}`)
  } catch {
    return { error: '게시물 ID 생성 실패' }
  }

  const frontmatter: Record<string, unknown> = {
    title,
    date,
    status,
    ...(description   ? { description }  : {}),
    ...(tags.length > 0 ? { tags }        : {}),
  }

  const content = buildMarkdown(frontmatter, body)

  try {
    await pushToGitHub({
      path:    `content/portfolio/${postId}.md`,
      content,
      message: `Create project: ${postId}`,
    })
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // ── 번역 (비차단) ───────────────────────────────────────
  try {
    const translation = await translatePost({
      title,
      description: description ?? undefined,
      body,
      fromLocale: 'ko',
      toLocale: 'en',
    })

    if (translation.success) {
      const enContent = buildEnMarkdown(
        { title, date, status, description, tags },
        translation.data,
      )
      await pushToGitHub({
        path: `content/portfolio/${postId}.en.md`,
        content: enContent,
        message: `Add EN translation: ${postId}`,
      })
    } else {
      console.error('[translate] skipped:', translation.error)
    }
  } catch (e) {
    console.error('[translate] failed (non-blocking):', e)
  }
  // ────────────────────────────────────────────────────────

  redirect('/private/inbox?saved=1')
}

export async function updateProject(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const postId      = (formData.get('postId') as string | null)?.trim() ?? ''
  const title       = (formData.get('title') as string | null)?.trim() ?? ''
  const body        = (formData.get('body') as string | null) ?? ''
  const date        = (formData.get('date') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw     = (formData.get('tags') as string | null) ?? ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const status      = (formData.get('status') as string | null)?.trim() || 'Shipped'

  if (!title)  return { error: '제목을 입력해주세요.' }
  if (!postId) return { error: '게시물 ID가 없습니다.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  const frontmatter: Record<string, unknown> = {
    title,
    date,
    status,
    ...(description   ? { description }  : {}),
    ...(tags.length > 0 ? { tags }        : {}),
    updatedAt: new Date().toISOString().split('T')[0],
  }

  const content = buildMarkdown(frontmatter, body)

  try {
    await pushToGitHub({
      path:    `content/portfolio/${postId}.md`,
      content,
      message: `Update project: ${postId}`,
    })
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // 기존 .en.md stale 처리: 삭제 후 재번역 시도
  try {
    await deleteFromGitHub(`content/portfolio/${postId}.en.md`)
  } catch (e) {
    console.error('[translate] delete existing EN failed (non-blocking):', e)
  }

  // ── 번역 (비차단) ───────────────────────────────────────
  try {
    const translation = await translatePost({
      title,
      description: description ?? undefined,
      body,
      fromLocale: 'ko',
      toLocale: 'en',
    })

    if (translation.success) {
      const enContent = buildEnMarkdown(
        { title, date, status, description, tags },
        translation.data,
      )
      await pushToGitHub({
        path: `content/portfolio/${postId}.en.md`,
        content: enContent,
        message: `Add EN translation: ${postId}`,
      })
    } else {
      console.error('[translate] skipped:', translation.error)
    }
  } catch (e) {
    console.error('[translate] failed (non-blocking):', e)
  }
  // ────────────────────────────────────────────────────────

  redirect('/private/inbox?saved=1')
}
