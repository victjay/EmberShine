'use client'

import { deleteInboxMessage } from './actions'

export default function DeleteButton({ id }: { id: string }) {
  return (
    <form action={deleteInboxMessage}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
      >
        삭제
      </button>
    </form>
  )
}
