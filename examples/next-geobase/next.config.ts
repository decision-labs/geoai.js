import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
        if (!isServer) {
          config.module.rules.push({
            test: /worker\.js$/,
            use: { loader: 'workerize-loader' },
          });
        }
        return config;
      },
  transpilePackages: ['geobase-ai'],
};


export default nextConfig;
