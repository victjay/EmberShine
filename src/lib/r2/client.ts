// Server-side only — R2 credentials must NEVER reach the client
import { S3Client } from '@aws-sdk/client-s3'

export function getR2Client(): S3Client {
  if (typeof window !== 'undefined') {
    throw new Error('R2 client must only be used server-side')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME!
}

// Public base URL for R2 assets — set R2_PUBLIC_URL in .env.local
// e.g. https://pub-xxxx.r2.dev  or  https://media.yourdomain.com
export function getR2PublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  if (!base) throw new Error('R2_PUBLIC_URL env var is not set')
  return `${base}/${key}`
}
