/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      https: false,
      http: false,
      path: false,
      stream: false,
      'node:fs': false,
      'node:https': false,
      'node:http': false,
      'node:path': false,
      'node:stream': false,
    };
    return config;
  },
};

module.exports = nextConfig;
