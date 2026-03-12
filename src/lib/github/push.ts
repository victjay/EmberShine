// Push a file to GitHub via the Contents API (create or update).
// Uses GITHUB_TOKEN (PAT) and GITHUB_REPO_URL from env.

export async function pushToGitHub(input: {
  path: string     // e.g. content/blog/2026-03-12-abc.md
  content: string  // raw file content (UTF-8)
  message: string  // commit message
}): Promise<void> {
  const token   = process.env.GITHUB_TOKEN
  const repoUrl = process.env.GITHUB_REPO_URL

  if (!token || !repoUrl) {
    throw new Error('[github/push] GITHUB_TOKEN or GITHUB_REPO_URL not set')
  }

  // Extract owner/repo from URL (handles https://github.com/owner/repo[.git])
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\s*$/)
  if (!match) throw new Error(`[github/push] Invalid GITHUB_REPO_URL: ${repoUrl}`)
  const repo = match[1]

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${input.path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'EmberShine-Bot/1.0',
  }

  // Check if file already exists (needed for the sha on update)
  let sha: string | undefined
  const getRes = await fetch(apiUrl, { headers })
  if (getRes.ok) {
    const existing = await getRes.json() as { sha: string }
    sha = existing.sha
  }

  // Create or update
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: input.message,
      content: Buffer.from(input.content, 'utf-8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  })

  if (!putRes.ok) {
    const body = await putRes.text()
    throw new Error(`[github/push] API error ${putRes.status}: ${body}`)
  }
}
