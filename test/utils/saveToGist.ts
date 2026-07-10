import fetch from "node-fetch";

const gistUploadsEnabled = (): boolean =>
  process.env.GEOAI_SAVE_GISTS === "1" && Boolean(process.env.TOKEN_GITHUB);

export async function geoJsonToGist({
  content,
  fileName = "output.geojson",
  description = "GeoJSON output from test",
  isPublic = true,
}) {
  if (!gistUploadsEnabled()) {
    return null;
  }

  try {
    const bodyContent =
      typeof content === "string" ? content : JSON.stringify(content, null, 2);

    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `token ${process.env.TOKEN_GITHUB}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        public: isPublic,
        files: {
          [fileName]: {
            content: bodyContent,
          },
        },
      }),
    });

    const data = (await res.json()) as { html_url?: string };
    if (!res.ok || !data.html_url) {
      return null;
    }

    console.log(`✅ Gist created: ${fileName} - ${data.html_url}`);
    return data.html_url;
  } catch {
    return null;
  }
}
