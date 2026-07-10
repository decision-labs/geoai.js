import nextra from "nextra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  defaultShowCopyCode: true,
});

export default withNextra({
  outputFileTracingRoot: path.join(__dirname, ".."),
  basePath: "/geoai",
  assetPrefix: "/geoai",
  images: {
    path: "/geoai/_next/image",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/geoai",
        permanent: false,
        basePath: false,
      },
    ];
  },
});
