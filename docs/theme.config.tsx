import React from "react";
import GeobaseLogo from "./components/geobase-logo";

const config = {
  head: ({ title }) => {
    return (
      <>
        <meta
          name="description"
          content="Find documentation, guides, examples, and blueprints for GeoAi.app"
        />
        <title>{title ? `${title} — GeoAi Docs` : "GeoAi Docs"}</title>
        <link
          rel="icon"
          type="image/x-icon"
          href="https://geobase.app/favicon.ico"
        />
      </>
    );
  },
  color: {
    hue: {
      dark: 152,
      light: 152,
    },
  },
  logo: (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img
        src="/geoai/javascript-logo.svg"
        alt="JavaScript logo"
        style={{
          height: "1.5rem",
          width: "auto",
          marginRight: "0.5rem",
          verticalAlign: "middle",
        }}
      />
      <pre style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
        @geobase/geoai.js
      </pre>
    </div>
  ),
  project: {
    link: "https://github.com/decision-labs/geobase-ai.js",
  },
  chat: {
    link: "https://geobase.app/discord",
  },
  navbar: {
  },
  docsRepositoryBase: "https://github.com/sabman/geobase-docs",
  defaultShowCopyCode: true,
  footer: {
    content: (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          © {new Date().getFullYear()} geoai.js. Open source project by the{" "}
          <a
            href="https://geobase.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "underline",
            }}
          >
            Geobase team
          </a>
        </span>
      </div>
    ),
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
  },
};

export default config;
