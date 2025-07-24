/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        worker_threads: false,
      };
    }
    return config;
  },
  turbopack: {
    sourceMap: {
      client: false,
      server: false
    },
    hmr: false
  }
};

module.exports = nextConfig;
