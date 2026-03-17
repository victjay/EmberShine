'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export async function deleteInboxMessage(formData: FormData): Promise<void> {
  await assertAdmin()

  const id = formData.get('id') as string
  if (!id) return

  const supabase = createServiceClient()

  // 연결된 draft_posts 먼저 삭제
  await supabase.from('draft_posts').delete().eq('inbox_id', id)

  // inbox_messages 삭제
  const { error } = await supabase
    .from('inbox_messages')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[inbox] deleteInboxMessage failed:', error.message)
    return
  }

  revalidatePath('/private/inbox')
}
