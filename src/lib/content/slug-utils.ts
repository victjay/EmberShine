// Slug utilities for generating and deduplicating post IDs.

export function safeSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^가-힣a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'untitled'
}

export async function ensureUniquePostId(section: string, baseId: string): Promise<string> {
  const token   = process.env.GITHUB_TOKEN
  const repoUrl = process.env.GITHUB_REPO_URL

  if (!token || !repoUrl) {
    throw new Error('[slug-utils] GITHUB_TOKEN or GITHUB_REPO_URL not set')
  }

  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\s*$/)
  if (!match) throw new Error(`[slug-utils] Invalid GITHUB_REPO_URL: ${repoUrl}`)
  const repo = match[1]

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'EmberShine-Bot/1.0',
  }

  async function exists(id: string): Promise<boolean> {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/content/${section}/${id}.md`,
      { headers },
    )
    return res.ok
  }

  if (!(await exists(baseId))) return baseId

  for (let i = 2; i <= 10; i++) {
    const candidate = `${baseId}-${i}`
    if (!(await exists(candidate))) return candidate
  }

  throw new Error(`[slug-utils] No unique postId found after 10 attempts for: ${baseId}`)
}
