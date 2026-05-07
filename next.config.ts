import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Required for Docker deployment
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/soc',
        permanent: false,
      },
    ];
  },
  typescript: {
    // Set to false for production — real type errors must be fixed
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'localhost:3000',
        '*.cluster-cd3bsnf6r5bemwki2bxljme5as.cloudworkstations.dev',
      ],
    },
  },
};

export default nextConfig;
