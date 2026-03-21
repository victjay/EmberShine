// ※ maxDuration은 Telegram API route 파일 상단에 직접 선언 (vercel.json과 별개)
export const maxDuration = 30
export const runtime = 'nodejs'

import { waitUntil } from '@vercel/functions'
import { translatePost } from '@/lib/ai/translate'
import { buildEnMarkdown } from '@/lib/content/en-file'
import { pushMultipleToGitHub, FileEntry } from '@/lib/github/push'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from '@/lib/telegram/sender'
import { answerCallbackQuery } from '@/lib/telegram/preview'
import { downloadTelegramFile } from '@/lib/telegram/files'
import { generateKey, uploadToR2 } from '@/lib/r2/upload'
import { buildMarkdown } from '@/lib/content/builder'
import { generateSNSDraft } from '@/lib/ai/sns-draft'
import { resolvePublicSlug } from '@/lib/content/resolvePublicSlug'

interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
}

interface RawPayload {
  message?: {
    photo?: TelegramPhotoSize[]
  }
}

export async function POST(req: Request) {
  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const inboxId = data.inboxId as string | undefined
  if (!inboxId) {
    return new Response('Missing inboxId', { status: 400 })
  }

  // callback query라면 즉시 ack (Telegram 로딩 progress bar 즉시 해제)
  if (data.callback_query && typeof data.callback_query === 'object') {
    const cq = data.callback_query as { id?: string }
    if (cq.id) {
      await answerCallbackQuery(cq.id)
    }
  }

  // ※ adminSupabase, messageId를 여기서 선언 — waitUntil 클로저에서도 참조 가능
  const adminSupabase = createAdminClient()
  const messageId = (() => {
    if (data.callback_query && typeof data.callback_query === 'object') {
      const cq = data.callback_query as { message?: { message_id?: number } }
      if (cq.message?.message_id != null) return cq.message.message_id
    }
    if (data.message && typeof data.message === 'object') {
      const msg = data.message as { message_id?: number }
      if (msg.message_id != null) return msg.message_id
    }
    return null
  })()

  if (messageId != null) {
    const { data: updated } = await adminSupabase
      .from('inbox_messages')
      .update({ status: 'processing' })
      .eq('telegram_message_id', messageId)
      .eq('status', 'pending')  // CAS: pending 상태일 때만 갱신
      .select('id')
      .maybeSingle()

    if (!updated) {
      // 이미 처리 중이거나 완료 → 중복 요청 무시
      return new Response('OK', { status: 200 })
    }
  }

  // 백그라운드 작업 예약
  // ※ adminSupabase, messageId가 클로저로 캡처됨 (스코프 상 접근 가능)
  waitUntil((async () => {
    try {
      await processApproval(inboxId, adminSupabase)
      // 성공 시 done으로 갱신
      if (messageId != null) {
        await adminSupabase
          .from('inbox_messages')
          .update({ status: 'done' })
          .eq('telegram_message_id', messageId)
      }
    } catch (e) {
      console.error('[telegram/approve] background error:', e)
      // 실패 시 반드시 failed로 복구 (processing stuck 방지)
      if (messageId != null) {
        await adminSupabase
          .from('inbox_messages')
          .update({ status: 'failed' })
          .eq('telegram_message_id', messageId)
      }
      await sendTelegramMessage(
        `❌ 발행 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`
      )
    }
  })())

  // Telegram 서버에 즉시 200 응답
  return new Response('OK', { status: 200 })
}

// 백그라운드 처리 함수
async function processApproval(
  inboxId: string,
  adminSupabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  const supabase = createServiceClient()

  // ── 1. Mark as processing ─────────────────────────────────────────────────
  await supabase
    .from('inbox_messages')
    .update({ status: 'processing' })
    .eq('id', inboxId)

  // ── 2. Fetch inbox row + latest draft ────────────────────────────────────
  const [inboxRes, draftRes] = await Promise.all([
    supabase
      .from('inbox_messages')
      .select('id, raw_payload, text_content, parsed_tags, target_section, telegram_date, created_at')
      .eq('id', inboxId)
      .single(),
    supabase
      .from('draft_posts')
      .select('id, section, title, body_markdown, frontmatter, created_at')
      .eq('inbox_id', inboxId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (inboxRes.error || !inboxRes.data) {
    await sendTelegramMessage(`❌ 오류: inbox 데이터를 찾을 수 없습니다. (ID: ${inboxId})`)
    return
  }

  const inbox = inboxRes.data
  const draft = draftRes.data  // may be null if AI generation was skipped

  // ── 3. Process image (if present) ────────────────────────────────────────
  let imageUrl: string | null = null
  const shootingDate: string | null = null
  const cameraModel: string | null = null

  const rawPayload = inbox.raw_payload as RawPayload
  const photos = rawPayload?.message?.photo

  if (photos && photos.length > 0) {
    try {
      const largestPhoto = photos[photos.length - 1]
      const rawBuffer = await downloadTelegramFile(largestPhoto.file_id)
      const slug = `${new Date().toISOString().slice(0, 10)}-${inboxId.slice(0, 8)}`
      const key  = generateKey(slug, 'jpg')
      imageUrl   = await uploadToR2(key, rawBuffer, 'image/jpeg')

      await supabase
        .from('inbox_messages')
        .update({ media_r2_url: imageUrl })
        .eq('id', inboxId)
    } catch (err) {
      console.error('[approve] Image upload failed:', err)
      await sendTelegramMessage(`⚠️ 이미지 업로드 실패 — 텍스트만으로 발행합니다.\n(${String(err)})`)
    }
  }

  // ── 4. Build content ──────────────────────────────────────────────────────
  const fm            = (draft?.frontmatter ?? {}) as Record<string, unknown>
  const title         = draft?.title         ?? inbox.text_content?.slice(0, 60) ?? '제목 없음'
  const body          = draft?.body_markdown ?? inbox.text_content ?? ''
  const summary       = (fm.ai_summary          as string) ?? ''
  const metaDesc      = (fm.ai_meta_description as string) ?? summary
  const aiTags        = (fm.ai_tags             as string[]) ?? []
  const section       = (draft?.section as 'blog' | 'stories' | 'portfolio') ?? 'blog'
  const description   = metaDesc || summary || null
  // slug 정책: draft가 있으면 draft seed, 없으면 inbox seed (모두 resolvePublicSlug 사용)
  const slugSeed = draft
    ? { id: draft.id, created_at: draft.created_at, frontmatter: draft.frontmatter }
    : { id: inboxId, created_at: (inbox.created_at as string), frontmatter: null }
  const slug = resolvePublicSlug(slugSeed)
  const mergedTags    = [...new Set([...(inbox.parsed_tags ?? []), ...aiTags])]

  const fullBody = imageUrl ? `![${title}](${imageUrl})\n\n${body}` : body

  // ※ today를 한 번만 생성 — KO/EN 모두 동일 기준값 사용
  const today = new Date().toISOString().split('T')[0]

  const koFrontmatter: Record<string, unknown> = {
    title,
    date: today,
    ...(description ? { description } : {}),
    ...(mergedTags.length > 0 ? { tags: mergedTags } : {}),
    ...(imageUrl ? { image: imageUrl, alt: title } : {}),
    ...(shootingDate !== null ? { shooting_date: String(shootingDate).slice(0, 10) } : {}),
    ...(cameraModel !== null ? { camera: String(cameraModel) } : {}),
    source_updated_at: today,
  }
  const koContent = buildMarkdown(koFrontmatter, fullBody)

  // ── 5. 번역 시도 (비차단) ─────────────────────────────────────────────────
  let enContent: string | null = null
  let translationFailed = false
  try {
    const translation = await translatePost({
      title,
      description: description ?? undefined,
      body: fullBody,
      fromLocale: 'ko',
      toLocale: 'en',
    })
    if (translation.success) {
      // EN frontmatter에 translated_from_updated_at 명시적 포함 (KO와 동일 today)
      const enFrontmatter = {
        ...koFrontmatter,
        translated_from_updated_at: today,  // ← KO와 동일 기준값
      }
      enContent = buildEnMarkdown(enFrontmatter, translation.data)
    } else {
      translationFailed = true
    }
  } catch (e) {
    translationFailed = true
    console.error('[telegram/approve] translation failed:', e)
  }

  // ── 6. 파일 목록 구성 ─────────────────────────────────────────────────────
  const files: FileEntry[] = [
    { path: `content/${section}/${slug}.md`, content: koContent },
  ]
  if (enContent) {
    files.push({ path: `content/${section}/${slug}.en.md`, content: enContent })
  }

  // ── 7. 단일 commit push ───────────────────────────────────────────────────
  const timestamp     = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const commitMessage = `post: ${title} ${timestamp}`

  let commitSha: string
  try {
    const result = await pushMultipleToGitHub({ files, message: commitMessage })
    commitSha = result.commitSha
  } catch (err) {
    console.error('[approve] GitHub push failed:', err)
    await supabase
      .from('inbox_messages')
      .update({ status: 'approved' })  // revert so Shine can retry
      .eq('id', inboxId)
    await sendTelegramMessage(`❌ GitHub 푸시 실패:\n${String(err)}\n\n다시 시도하려면 ✅ 버튼을 눌러주세요.`)
    return
  }

  // ── 8. deployments 기록 (비차단) ─────────────────────────────────────────
  try {
    await adminSupabase.from('deployments').insert({
      commit_sha: commitSha,
      post_id: slug,
      post_section: section,
      status: 'building',
    })
  } catch (e) {
    console.error('[telegram/approve] deployment tracking failed:', e)
  }

  // ── 9. Update statuses ────────────────────────────────────────────────────
  await Promise.all([
    supabase
      .from('inbox_messages')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', inboxId),
    draft
      ? supabase
          .from('draft_posts')
          .update({ status: 'published', github_path: `content/${section}/${slug}.md` })
          .eq('id', draft.id)
      : Promise.resolve(),
  ])

  // ── 10. Telegram 완료 알림 ────────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const postUrl = `${siteUrl}/ko/${section}/${slug}`  // ← /ko/ 필수
  const translationNote = translationFailed
    ? '\n⚠️ 한국어만 발행됨 (번역 오류 발생)'
    : enContent
    ? '\n🌐 KO + EN 발행 완료'
    : ''

  await sendTelegramMessage(
    `✅ 발행되었습니다. 배포 중... (2-5분 소요)\n\n` +
    `제목: ${title}\n` +
    `경로: content/${section}/${slug}.md\n` +
    `${postUrl}${translationNote}`
  )

  // ── 11. SNS draft (non-blocking) ──────────────────────────────────────────
  try {
    const snsDraft = await generateSNSDraft({
      title,
      description: metaDesc,
      url:         postUrl,
      tags:        mergedTags,
    })
    const twitterLen = snsDraft.twitter.length
    await sendTelegramMessage(
      `📢 SNS 초안\n\n` +
      `🐦 X/Twitter (${twitterLen}/280자):\n${snsDraft.twitter}\n\n` +
      `💼 LinkedIn:\n${snsDraft.linkedin}`,
    )
  } catch (err) {
    console.error('[approve] SNS draft generation failed:', err)
  }
}
