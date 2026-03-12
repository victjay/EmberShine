// Claude API draft generation — server-side + GitHub Actions only
// Placeholder — full implementation in Task 5 (batch automation)

export interface DraftInput {
  textContent: string
  targetSection: string
  tags: string[]
}

export interface DraftOutput {
  title: string
  bodyMarkdown: string
  frontmatter: Record<string, unknown>
}

export async function generateDraft(_input: DraftInput): Promise<DraftOutput> {
  throw new Error('generateDraft: not yet implemented — see Task 5')
}
