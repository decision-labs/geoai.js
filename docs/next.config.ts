import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  defaultShowCopyCode: true,
});

export default withNextra({
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
