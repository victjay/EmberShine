// Server-side only — R2 credentials must NEVER reach the client
// Requires: aws4fetch or @aws-sdk/client-s3 (add when implementing upload)

export const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
}

// Placeholder — full implementation in Task 3 (image upload)
export function getR2Client() {
  if (typeof window !== 'undefined') {
    throw new Error('R2 client must only be used server-side')
  }
  return R2_CONFIG
}
