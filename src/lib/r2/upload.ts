// Server-side only
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName, getR2PublicUrl } from './client'
import crypto from 'crypto'

// /[year]/[month]/[slug]-[hash].[ext]
export function generateKey(slug: string, ext: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const hash = crypto.randomBytes(6).toString('hex')
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${year}/${month}/${safeSlug}-${hash}.${ext}`
}

// Direct server → R2 upload (use after Sharp processing)
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  return getR2PublicUrl(key)
}

// Generate a presigned PUT URL — client uploads directly to R2
// R2 credentials never leave the server
export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 300, // 5 minutes
): Promise<{ presignedUrl: string; publicUrl: string }> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ContentType: contentType,
  })
  const presignedUrl = await getSignedUrl(client, command, { expiresIn })
  const publicUrl = getR2PublicUrl(key)
  return { presignedUrl, publicUrl }
}
