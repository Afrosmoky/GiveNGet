import { environment } from './src/config/index';
import type { NextConfig } from "next";

const isLocal = environment.environmentName === 'local';

const nextConfig: NextConfig = {
  output: 'standalone', // To pozostaje
  reactStrictMode: false, // Wyłączone — zapobiega podwójnemu odpalaniu useEffect (podwójny upload zdjęć, podwójna weryfikacja)

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  images: {
    unoptimized: isLocal,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/api/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '',
        pathname: '/api/static/**',
      },
      {
        protocol: 'http',
        hostname: '194.164.17.166', 
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'https', 
        hostname: '194.164.17.166',
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'http',
        hostname: 'www.gngdev.pl',
        port: '',
        pathname: '/backend-assets/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gngdev.pl',
        port: '',
        pathname: '/backend-assets/**',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/backend-assets/:path*', 
        destination: `http://backend:8080/uploads/:path*`, 
      },
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;