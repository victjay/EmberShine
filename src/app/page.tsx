import { redirect } from 'next/navigation'

// Proxy redirects / → /ko, but this is a safety fallback
export default function RootPage() {
  redirect('/ko')
}
