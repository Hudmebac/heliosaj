import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       // Add other image hostnames if needed
    ],
  },
  // Add environment variable handling if necessary for API keys
  // env: {
  //   NEXT_PUBLIC_WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  // },
}

export default nextConfig
