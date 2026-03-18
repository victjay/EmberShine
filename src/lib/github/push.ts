// Push or delete files on GitHub via the Git Data API.
// Uses GITHUB_TOKEN (PAT) and GITHUB_REPO_URL from env.

// ※ export 필수 — actions.ts, approve.ts에서 import 사용
export interface FileEntry {
  path: string
  content?: string   // 신규/수정 시
  delete?: boolean   // 삭제 시 true
}

function getGitHubConfig() {
  const token   = process.env.GITHUB_TOKEN
  const repoUrl = process.env.GITHUB_REPO_URL

  if (!token || !repoUrl) {
    throw new Error('[github/push] GITHUB_TOKEN or GITHUB_REPO_URL not set')
  }

  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\s*$/)
  if (!match) throw new Error(`[github/push] Invalid GITHUB_REPO_URL: ${repoUrl}`)

  return { token, repo: match[1] }
}

export async function getFileContent(path: string): Promise<string | null> {
  const { token, repo } = getGitHubConfig()
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { Authorization: `token ${token}` } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub 파일 읽기 실패: ${res.status}`)
  const data = await res.json() as { content: string }
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

export async function checkFileExists(path: string): Promise<boolean> {
  const { token, repo } = getGitHubConfig()
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers: { Authorization: `token ${token}` } }
  )
  if (res.status === 200) return true
  if (res.status === 404) return false
  // 403/500 등 예외 → throw
  throw new Error(`GitHub 파일 존재 확인 실패: ${res.status}`)
}

export async function pushMultipleToGitHub({
  files,
  message,
}: {
  files: FileEntry[]
  message: string
}): Promise<{ commitSha: string }> {
  const { token, repo } = getGitHubConfig()
  const BASE = `https://api.github.com/repos/${repo}`
  const headers = {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
  }

  // 최대 3회 재시도 (경합 조건 대비)
  for (let attempt = 0; attempt < 3; attempt++) {
    // 1. HEAD commit SHA (조회: /git/ref/ 단수)
    const refRes = await fetch(`${BASE}/git/ref/heads/main`, { headers })
    if (!refRes.ok) throw new Error(`ref 조회 실패: ${refRes.status}`)
    const { object: { sha: currentCommitSha } } = await refRes.json() as {
      object: { sha: string }
    }

    // 2. tree SHA
    const commitRes = await fetch(`${BASE}/git/commits/${currentCommitSha}`, { headers })
    if (!commitRes.ok) throw new Error(`commit 조회 실패: ${commitRes.status}`)
    const { tree: { sha: baseTreeSha } } = await commitRes.json() as {
      tree: { sha: string }
    }

    // 3. tree entries 구성
    // blob 생성 없이 content 직접 포함 (텍스트 파일)
    // sha와 content를 동시에 주면 API 에러 → 반드시 둘 중 하나만
    const treeEntries = files.map((file) => {
      if (file.delete) {
        // 삭제: sha: null
        // ※ 없는 path에 보내면 422 에러 → 반드시 checkFileExists 선행 확인
        return { path: file.path, mode: '100644', type: 'blob', sha: null }
      }
      return { path: file.path, mode: '100644', type: 'blob', content: file.content }
    })

    // 4. 새 tree 생성
    const treeRes = await fetch(`${BASE}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
    })
    if (!treeRes.ok) throw new Error(`tree 생성 실패: ${treeRes.status}`)
    const { sha: newTreeSha } = await treeRes.json() as { sha: string }

    // 5. 새 commit 생성
    const newCommitRes = await fetch(`${BASE}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        tree: newTreeSha,
        parents: [currentCommitSha],
      }),
    })
    if (!newCommitRes.ok) throw new Error(`commit 생성 실패: ${newCommitRes.status}`)
    const { sha: newCommitSha } = await newCommitRes.json() as { sha: string }

    // 6. ref 업데이트 (갱신: /git/refs/ 복수, force: false)
    const updateRes = await fetch(`${BASE}/git/refs/heads/main`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: newCommitSha, force: false }),
    })

    if (updateRes.status === 422) {
      if (attempt < 2) continue
      throw new Error('동시 수정이 감지됐습니다. 잠시 후 다시 시도해주세요.')
    }
    if (!updateRes.ok) throw new Error(`ref 업데이트 실패: ${updateRes.status}`)

    return { commitSha: newCommitSha }
  }

  throw new Error('최대 재시도 횟수 초과')
}

export async function pushToGitHub(input: {
  path: string
  content: string
  message: string
}): Promise<void> {
  await pushMultipleToGitHub({
    files: [{ path: input.path, content: input.content }],
    message: input.message,
  })
}

export async function deleteFromGitHub(path: string): Promise<void> {
  const exists = await checkFileExists(path)
  if (!exists) return
  await pushMultipleToGitHub({
    files: [{ path, delete: true }],
    message: `Delete: ${path}`,
  })
}
