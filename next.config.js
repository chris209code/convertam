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
    };
    return config;
  },
};

module.exports = nextConfig;
