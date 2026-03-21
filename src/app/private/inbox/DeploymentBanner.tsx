'use client'

import { useRouter } from 'next/navigation'

interface Props {
  status: string | null
}

export default function DeploymentBanner({ status }: Props) {
  const router = useRouter()

  const isBuilding = !status || status === 'building'

  const bannerCls = isBuilding
    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : status === 'ready'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-red-50 border-red-200 text-red-800'

  const message = isBuilding
    ? '🔄 배포 진행 중... (보통 1~3분 소요)'
    : status === 'ready'
    ? '✅ 배포 완료! 라이브 사이트에 반영됐습니다.'
    : status === 'canceled'
    ? '⚠️ 배포가 취소됐습니다. Vercel 대시보드를 확인해주세요.'
    : '❌ 배포 실패. Vercel 대시보드를 확인해주세요.'

  return (
    <div className={`mb-6 px-4 py-3 rounded-lg text-sm border flex items-center justify-between gap-3 ${bannerCls}`}>
      <span>{message}</span>
      {isBuilding && (
        <button
          onClick={() => router.refresh()}
          className="shrink-0 px-2.5 py-1 text-xs font-medium border rounded-lg transition-colors border-yellow-300 hover:bg-yellow-100"
        >
          새로고침
        </button>
      )}
    </div>
  )
}
