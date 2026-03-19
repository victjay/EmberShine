'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/server'
import {
  getFileContent,
  checkFileExists,
  pushMultipleToGitHub,
  listGitHubDirectory,
  type FileEntry,
} from '@/lib/github/push'
import matter from 'gray-matter'

// ────────────────────────────────────────────────────────────────
// 카테고리 추가 (soft-deleted 동명 카테고리는 복원)
// ────────────────────────────────────────────────────────────────

export async function addCategory(
  section: 'blog' | 'stories' | 'portfolio',
  name: string,
): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const trimmed = name.trim()
  if (!trimmed) return { error: '카테고리 이름을 입력해주세요.' }

  const adminSupabase = createAdminClient()

  const { data: existing } = await adminSupabase
    .from('categories')
    .select('id, deleted_at')
    .eq('section', section)
    .eq('name', trimmed)
    .maybeSingle()

  if (existing) {
    if (existing.deleted_at === null) {
      return { error: '이미 존재하는 카테고리입니다.' }
    }
    // soft-deleted → 관리자 명시 재추가 = 복원 (tombstone 해제)
    const { error } = await adminSupabase
      .from('categories')
      .update({ deleted_at: null })
      .eq('id', existing.id)
    if (error) return { error: '카테고리 복원 실패: ' + error.message }
  } else {
    const { error } = await adminSupabase
      .from('categories')
      .insert({ name: trimmed, section, deleted_at: null })
    if (error) return { error: '카테고리 추가 실패: ' + error.message }
  }

  revalidatePath('/private/categories')
  revalidatePath('/private/inbox')
}

// ────────────────────────────────────────────────────────────────
// 카테고리 삭제 (영향받는 포스트 비공개 처리 → draft 복원)
//
// 트랜잭션 순서 엄수:
//  1. GitHub 현재 파일 목록 조회 → 해당 카테고리 포스트 필터
//  2. GitHub 파일 읽기 (복원 원천 데이터 확보)
//  3. GitHub 파일 삭제 push
//  4. push 성공 확인 후에만 Supabase draft 복원
//  5. categories soft-delete
// ────────────────────────────────────────────────────────────────

export async function deleteCategory(
  categoryId: string,
  section: 'blog' | 'stories' | 'portfolio',
  name: string,
): Promise<{ error: string } | undefined> {
  await assertAdmin()

  const adminSupabase = createAdminClient()
  const supabase      = createServiceClient()

  // 1. GitHub 현재 slug 목록 조회
  let slugs: string[]
  try {
    slugs = await listGitHubDirectory(`content/${section}`)
  } catch (e) {
    return { error: `GitHub 파일 목록 조회 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
  }

  // 2. 각 파일 읽어서 카테고리 일치 여부 확인 (GitHub 현재 상태 기준)
  interface RestorationData {
    slug: string
    title: string
    body_markdown: string
    frontmatter: Record<string, unknown>
  }
  const files: FileEntry[]          = []
  const restorations: RestorationData[] = []

  await Promise.all(
    slugs.map(async (slug) => {
      const koPath = `content/${section}/${slug}.md`
      const koRaw  = await getFileContent(koPath)
      if (!koRaw) return

      const { data: koData, content: koBody } = matter(koRaw)
      if (koData.category !== name) return

      // 이 포스트가 대상 카테고리를 가짐 → 삭제 + 복원 대상
      restorations.push({
        slug,
        title:        (koData.title as string) ?? slug,
        body_markdown: koBody.trim(),
        frontmatter:  koData,
      })

      files.push({ path: koPath, delete: true })

      // EN 파일 존재 시 함께 삭제
      const enPath = `content/${section}/${slug}.en.md`
      if (await checkFileExists(enPath)) {
        files.push({ path: enPath, delete: true })
      }
    })
  )

  // 3. GitHub 파일 삭제 push (포스트가 있는 경우만)
  if (files.length > 0) {
    try {
      await pushMultipleToGitHub({
        files,
        message: `Category deleted: '${name}' — unpublish ${restorations.length} posts`,
      })
    } catch (e) {
      return { error: `GitHub 삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}` }
    }

    // 4. GitHub push 성공 확인 후에만 Supabase draft 복원
    //    ⚠️ 순서 엄수: GitHub 삭제 전 Supabase 커밋 금지
    for (const r of restorations) {
      await supabase.from('draft_posts').insert({
        section,
        title:          r.title,
        body_markdown:  r.body_markdown,
        status:         'draft',
        draft_stage:    'categorizing',
        frontmatter:    r.frontmatter,
        github_path:    null,
        inbox_id:       null,
      })
    }

    // 공개 페이지 캐시 무효화
    for (const r of restorations) {
      revalidatePath(`/ko/${section}/${r.slug}`)
      revalidatePath(`/en/${section}/${r.slug}`)
    }
    revalidatePath(`/ko/${section}`)
    revalidatePath(`/en/${section}`)

    // 시스템 알림: 카테고리 삭제로 비공개 처리된 포스트 안내
    await adminSupabase.from('system_notifications').insert({
      type: 'warning',
      source: 'category',
      message: `카테고리 '${name}' 삭제로 포스트 ${restorations.length}개가 비공개 처리됐습니다. Workspace에서 카테고리를 재지정해주세요.`,
      action_required: true,
    })
  }

  // 5. 카테고리 soft-delete tombstone (AI excluded_version 자동 갱신)
  await adminSupabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', categoryId)

  revalidatePath('/private/categories')
  revalidatePath('/private/inbox')
}
