import Providers from '@/components/Providers'

export default function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
    </Providers>
  )
}
