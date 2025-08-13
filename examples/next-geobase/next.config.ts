import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/geoai-live",
  assetPrefix: "/geoai-live",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/geoai-live",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/geoai-live",
        permanent: false,
        basePath: false,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Configure webpack for WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add worker support for non-server builds
    if (!isServer) {
      config.module.rules.push({
        test: /worker\.js$/,
        use: { loader: "workerize-loader" },
      });

      // Ensure certain Node APIs are not polyfilled client-side
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        worker_threads: false,
      };
    }

    // Configure WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },
  transpilePackages: ["@geobase-js/geoai"],
  // Configure headers for WASM files
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
