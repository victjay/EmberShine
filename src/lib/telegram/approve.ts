// Full approval pipeline: image upload → R2 → markdown build → GitHub push.
// Called via after() so the Telegram response is not blocked.
//
// NOTE: Sharp image processing (resize/WebP/EXIF strip) is intentionally skipped
// here — Sharp requires native binaries incompatible with Vercel serverless.
// Raw JPEG from Telegram is uploaded directly to R2.
// Phase 5 will add a separate image-processing step via a dedicated worker.

import { createServiceClient } from '@/lib/supabase/server'
import { sendTelegramMessage } from './sender'
import { downloadTelegramFile } from './files'
import { generateKey, uploadToR2 } from '@/lib/r2/upload'
import { buildMarkdown } from '@/lib/content/builder'
import { pushToGitHub } from '@/lib/github/push'

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

export async function runApprovalPipeline(inboxId: string): Promise<void> {
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
      .select('id, raw_payload, text_content, parsed_tags, target_section, telegram_date')
      .eq('id', inboxId)
      .single(),
    supabase
      .from('draft_posts')
      .select('id, section, title, body_markdown, frontmatter')
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
  let shootingDate: string | null = null
  let cameraModel: string | null = null

  const rawPayload = inbox.raw_payload as RawPayload
  const photos = rawPayload?.message?.photo

  if (photos && photos.length > 0) {
    try {
      // Telegram sends multiple sizes — last entry is the largest
      const largestPhoto = photos[photos.length - 1]

      // Upload raw JPEG directly — Sharp processing deferred to Phase 5
      const rawBuffer = await downloadTelegramFile(largestPhoto.file_id)
      const slug = `${new Date().toISOString().slice(0, 10)}-${inboxId.slice(0, 8)}`
      const key  = generateKey(slug, 'jpg')
      imageUrl   = await uploadToR2(key, rawBuffer, 'image/jpeg')

      // Persist R2 URL on inbox row
      await supabase
        .from('inbox_messages')
        .update({ media_r2_url: imageUrl })
        .eq('id', inboxId)
    } catch (err) {
      console.error('[approve] Image upload failed:', err)
      await sendTelegramMessage(`⚠️ 이미지 업로드 실패 — 텍스트만으로 발행합니다.\n(${String(err)})`)
    }
  }

  // ── 4. Build markdown ─────────────────────────────────────────────────────
  const fm            = (draft?.frontmatter ?? {}) as Record<string, unknown>
  const title         = draft?.title         ?? inbox.text_content?.slice(0, 60) ?? '제목 없음'
  const body          = draft?.body_markdown ?? inbox.text_content ?? ''
  const summary       = (fm.ai_summary         as string) ?? ''
  const metaDesc      = (fm.ai_meta_description as string) ?? summary
  const aiTags        = (fm.ai_tags            as string[]) ?? []
  const section       = (draft?.section as 'blog' | 'stories' | 'portfolio') ?? 'blog'
  const date          = new Date().toISOString().slice(0, 10)
  const slug          = `${date}-${inboxId.slice(0, 8)}`
  const mergedTags    = [...new Set([...(inbox.parsed_tags ?? []), ...aiTags])]

  const { content: markdownContent, path: githubPath } = buildMarkdown({
    title,
    date,
    summary,
    tags:          mergedTags,
    imageUrl,
    imageAlt:      imageUrl ? title : null,
    metaDescription: metaDesc,
    section,
    shootingDate,
    cameraModel,
    slug,
    body,
  })

  // ── 5. Push to GitHub ─────────────────────────────────────────────────────
  const timestamp     = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const commitMessage = `post: ${title} ${timestamp}`

  try {
    await pushToGitHub({ path: githubPath, content: markdownContent, message: commitMessage })
  } catch (err) {
    console.error('[approve] GitHub push failed:', err)
    await supabase
      .from('inbox_messages')
      .update({ status: 'approved' })   // revert to approved so Shine can retry
      .eq('id', inboxId)
    await sendTelegramMessage(`❌ GitHub 푸시 실패:\n${String(err)}\n\n다시 시도하려면 ✅ 버튼을 눌러주세요.`)
    return
  }

  // ── 6. Update statuses ────────────────────────────────────────────────────
  await Promise.all([
    supabase
      .from('inbox_messages')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', inboxId),
    draft
      ? supabase
          .from('draft_posts')
          .update({ status: 'published', github_path: githubPath })
          .eq('id', draft.id)
      : Promise.resolve(),
  ])

  // ── 7. Confirm ────────────────────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await sendTelegramMessage(
    `✅ 발행되었습니다. 배포 중... (2-5분 소요)\n\n` +
    `제목: ${title}\n` +
    `경로: ${githubPath}\n` +
    `${siteUrl}/${section}/${slug}`,
  )
}
