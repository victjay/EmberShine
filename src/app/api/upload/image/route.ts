import { NextResponse } from 'next/server'

// Placeholder — full implementation in Task 3 (R2 image upload)
// Hard rule: R2 credentials server-side only, presigned PUT URL pattern
// Hard rule: EXIF GPS + device identifiers must be stripped before upload
export async function POST() {
  return NextResponse.json({ ok: true, status: 'placeholder' })
}
