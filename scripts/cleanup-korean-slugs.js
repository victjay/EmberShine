'use strict'
// One-time cleanup: delete Korean-slug posts from GitHub + Supabase
// Run: node scripts/cleanup-korean-slugs.js

const fs   = require('fs')
const path = require('path')

// --- load .env.local ---
const envPath = path.join(__dirname, '..', '.env.local')
const envVars = {}
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  })
}
const GITHUB_TOKEN     = envVars['GITHUB_TOKEN']
const GITHUB_REPO_URL  = envVars['GITHUB_REPO_URL']
const SUPABASE_URL     = envVars['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY     = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!GITHUB_TOKEN || !GITHUB_REPO_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Check .env.local')
  process.exit(1)
}

const repoMatch = GITHUB_REPO_URL.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\s*$/)
if (!repoMatch) { console.error('Invalid GITHUB_REPO_URL'); process.exit(1) }
const REPO = repoMatch[1]

const GH_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'EmberShine-Bot/1.0',
}

const KOREAN_SLUGS = [
  { section: 'blog',    slug: '2026-03-20-workspace에서-blog-포스팅-테스트합니다' },
  { section: 'stories', slug: '2026-03-21-제목-없음' },
]

async function getFileSha(filePath) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    { headers: GH_HEADERS }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET ${filePath}: ${res.status}`)
  const data = await res.json()
  return data.sha
}

async function deleteGitHubFile(filePath, sha) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    {
      method: 'DELETE',
      headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `cleanup: remove Korean-slug post ${filePath}`, sha }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DELETE ${filePath}: ${res.status} ${body}`)
  }
  console.log(`  ✓ GitHub deleted: ${filePath}`)
}

async function deleteSupabaseRow(section, slug) {
  // github_path stores the postId (slug without .md)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/draft_posts?github_path=eq.${encodeURIComponent(slug)}&section=eq.${section}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase DELETE ${section}/${slug}: ${res.status} ${body}`)
  }
  const deleted = await res.json()
  console.log(`  ✓ Supabase deleted: ${deleted.length} row(s) for ${section}/${slug}`)
}

async function main() {
  for (const { section, slug } of KOREAN_SLUGS) {
    console.log(`\n[${section}/${slug}]`)

    // GitHub: delete .md and .en.md (if exists)
    for (const ext of ['.md', '.en.md']) {
      const filePath = `content/${section}/${slug}${ext}`
      const sha = await getFileSha(filePath)
      if (sha) {
        await deleteGitHubFile(filePath, sha)
      } else {
        console.log(`  ─ not found on GitHub: ${filePath}`)
      }
      // Brief delay to avoid secondary rate limit
      await new Promise((r) => setTimeout(r, 500))
    }

    // Supabase: delete row
    await deleteSupabaseRow(section, slug)
  }
  console.log('\nCleanup complete.')
}

main().catch((err) => { console.error(err); process.exit(1) })
