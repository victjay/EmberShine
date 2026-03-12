'use client'

import Giscus from '@giscus/react'

const REPO        = (process.env.NEXT_PUBLIC_GISCUS_REPO        ?? '') as `${string}/${string}`
const REPO_ID     = process.env.NEXT_PUBLIC_GISCUS_REPO_ID      ?? ''
const CATEGORY    = process.env.NEXT_PUBLIC_GISCUS_CATEGORY     ?? 'Comments'
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID  ?? ''

export default function Comments() {
  if (!REPO || !REPO_ID || !CATEGORY_ID) return null

  return (
    <div className="mt-16 pt-10 border-t border-slate-100">
      <Giscus
        repo={REPO}
        repoId={REPO_ID}
        category={CATEGORY}
        categoryId={CATEGORY_ID}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="light"
        lang="ko"
        loading="lazy"
      />
    </div>
  )
}
