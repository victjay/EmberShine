import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to optimize R2-hosted images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',                   // public R2 bucket URL
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com', // direct R2 URL
      },
    ],
  },
}

export default nextConfig
