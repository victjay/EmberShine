// Build markdown content (frontmatter + body) ready for GitHub push.
// Uses matter.stringify() — never build frontmatter with template strings.

import matter from 'gray-matter'

export function buildMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  return matter.stringify(body, frontmatter)
}
