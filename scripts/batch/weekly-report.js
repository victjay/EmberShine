'use strict'
// Job 6 — Weekly Report (Mondays only when run via schedule; always when explicit)
// Combines: Cloudflare Web Analytics + Supabase stats + R2 storage usage.
//
// Required env vars:
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CF_SITE_TAG  (Web Analytics)
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, CLOUDFLARE_ACCOUNT_ID

const { createClient }       = require('@supabase/supabase-js')
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { sendTelegramMessage, runJob }    = require('./_utils')

// Guard: only run on Monday for scheduled (cron) invocations.
// Set WEEKLY_REPORT_FORCE=true to bypass for workflow_dispatch testing.
const isMonday = new Date().getUTCDay() === 1
if (!isMonday && !process.env.WEEKLY_REPORT_FORCE) {
  console.log('[weekly-report] Not Monday — skipping')
  process.exit(0)
}

runJob('Weekly Report', async () => {
  const lines = []
  const today = new Date()
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000)
  const dateStr = today.toISOString().slice(0, 10)
  const weekAgoStr = weekAgo.toISOString().slice(0, 10)

  lines.push(`📈 [주간 리포트] ${weekAgoStr} ~ ${dateStr}`, '')

  // ── 1. Cloudflare Web Analytics ─────────────────────────────────────────
  const cfToken   = process.env.CLOUDFLARE_API_TOKEN
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID
  const cfSiteTag = process.env.CF_SITE_TAG

  if (cfToken && cfAccount && cfSiteTag) {
    try {
      const query = `{
        viewer {
          accounts(filter: { accountTag: "${cfAccount}" }) {
            total: rumWebsiteMetricsAdaptiveGroups(
              filter: { AND: [
                { siteTag: "${cfSiteTag}" },
                { date_geq: "${weekAgoStr}" },
                { date_leq: "${dateStr}" }
              ]}
              limit: 1
            ) { pageviews }
            top5: rumWebsiteMetricsAdaptiveGroups(
              filter: { AND: [
                { siteTag: "${cfSiteTag}" },
                { date_geq: "${weekAgoStr}" },
                { date_leq: "${dateStr}" }
              ]}
              limit: 5
              orderBy: [pageviews_DESC]
            ) {
              pageviews
              dimensions { requestPath }
            }
          }
        }
      }`

      const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${cfToken}`,
        },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      const acct = data?.data?.viewer?.accounts?.[0]

      if (acct) {
        const totalPV = acct.total?.[0]?.pageviews ?? 0
        lines.push(`👁 총 페이지뷰: ${totalPV.toLocaleString()}회`)
        lines.push('')
        lines.push('🔝 인기 페이지 TOP 5:')
        for (const item of (acct.top5 ?? [])) {
          lines.push(`  ${item.dimensions.requestPath.padEnd(40)} ${item.pageviews}회`)
        }
        lines.push('')
      }
    } catch (err) {
      console.warn('[weekly-report] Cloudflare Analytics failed:', err.message)
      lines.push('👁 방문자 통계: 조회 실패', '')
    }
  } else {
    lines.push('👁 방문자 통계: CLOUDFLARE_API_TOKEN / CF_SITE_TAG 미설정', '')
  }

  // ── 2. Supabase: new posts + pending inbox ───────────────────────────────
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const [newPostsRes, pendingRes] = await Promise.all([
      supabase
        .from('inbox_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', weekAgo.toISOString()),
      supabase
        .from('inbox_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    lines.push(`📝 이번 주 발행: ${newPostsRes.count ?? 0}개`)
    lines.push(`📥 대기 중 inbox: ${pendingRes.count ?? 0}개`)
    lines.push('')
  } else {
    lines.push('📝 Supabase 통계: 환경변수 미설정', '')
  }

  // ── 3. R2 storage usage ──────────────────────────────────────────────────
  const bucket = process.env.R2_BUCKET_NAME
  if (bucket && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
    try {
      const s3 = new S3Client({
        region:   'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId:     process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })

      let objects = []
      let ContinuationToken
      do {
        const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }))
        objects.push(...(res.Contents ?? []))
        ContinuationToken = res.NextContinuationToken
      } while (ContinuationToken)

      const totalBytes = objects.reduce((s, o) => s + (o.Size ?? 0), 0)
      const totalMB    = (totalBytes / 1024 / 1024).toFixed(1)
      lines.push(`🗄 R2 스토리지: ${objects.length}개 파일, ${totalMB} MB`)
    } catch (err) {
      console.warn('[weekly-report] R2 list failed:', err.message)
      lines.push('🗄 R2 스토리지: 조회 실패')
    }
  } else {
    lines.push('🗄 R2 스토리지: 환경변수 미설정')
  }

  await sendTelegramMessage(lines.join('\n'))
  console.log('[weekly-report] Report sent')
})
