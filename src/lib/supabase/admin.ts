// service role 전용 클라이언트
// 절대 SSR auth client(createClient)와 혼용 금지
// Client Component에서 import 금지
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
