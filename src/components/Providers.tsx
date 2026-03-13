'use client'

import { LangProvider } from '@/lib/i18n/context'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LangProvider>{children}</LangProvider>
}
