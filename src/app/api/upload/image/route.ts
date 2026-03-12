// Server-side only — R2 credentials never leave this handler
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processImage } from '@/lib/image/process'
import { generateKey, uploadToR2 } from '@/lib/r2/upload'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function POST(request: NextRequest) {
  // Auth check — must be the owner
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const slug = (formData.get('slug') as string | null) ?? 'image'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  // Process: strip EXIF GPS, resize, convert to WebP
  const processed = await processImage(inputBuffer)

  // Upload to R2
  const key = generateKey(slug, 'webp')
  const publicUrl = await uploadToR2(key, processed.buffer, processed.mimeType)

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    key,
    width: processed.width,
    height: processed.height,
    shootingDate: processed.shootingDate,
    cameraModel: processed.cameraModel,
  })
}
