'use server'

import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/auth/admin'
import { safeSlug, ensureUniquePostId } from '@/lib/content/slug-utils'
import { buildMarkdown } from '@/lib/content/builder'
import { pushToGitHub } from '@/lib/github/push'

export async function createBlogPost(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const title       = (formData.get('title') as string | null)?.trim() ?? ''
  const body        = (formData.get('body') as string | null) ?? ''
  const date        = (formData.get('date') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw     = (formData.get('tags') as string | null) ?? ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)

  if (!title) return { error: '제목을 입력해주세요.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  let postId: string
  try {
    postId = await ensureUniquePostId('blog', `${date}-${slug}`)
  } catch {
    return { error: '게시물 ID 생성 실패' }
  }

  const frontmatter: Record<string, unknown> = {
    title,
    date,
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  }

  const content = buildMarkdown(frontmatter, body)

  try {
    await pushToGitHub({
      path: `content/blog/${postId}.md`,
      content,
      message: `Create blog post: ${postId}`,
    })
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  redirect('/private/inbox?saved=1')
}

export async function updateBlogPost(formData: FormData): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const postId      = (formData.get('postId') as string | null)?.trim() ?? ''
  const title       = (formData.get('title') as string | null)?.trim() ?? ''
  const body        = (formData.get('body') as string | null) ?? ''
  const date        = (formData.get('date') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const tagsRaw     = (formData.get('tags') as string | null) ?? ''
  const tags        = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)

  if (!title)  return { error: '제목을 입력해주세요.' }
  if (!postId) return { error: '게시물 ID가 없습니다.' }

  const slug = safeSlug(title)
  if (!slug) return { error: '유효한 제목을 입력해주세요.' }

  const frontmatter: Record<string, unknown> = {
    title,
    date,
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    updatedAt: new Date().toISOString().split('T')[0],
  }

  const content = buildMarkdown(frontmatter, body)

  try {
    await pushToGitHub({
      path: `content/blog/${postId}.md`,
      content,
      message: `Update blog post: ${postId}`,
    })
  } catch (e) {
    return { error: `GitHub push 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  redirect('/private/inbox?saved=1')
}
