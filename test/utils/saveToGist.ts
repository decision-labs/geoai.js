import fetch from "node-fetch";

export async function geoJsonToGist({
  content,
  fileName = "output.geojson",
  description = "GeoJSON output from test",
  isPublic = true,
}) {
  const token = process.env.TOKEN_GITHUB;
  if (!token) {
    console.warn("⚠️ No GitHub token found. Skipping Gist creation.");
    return null;
  }

  try {
    const bodyContent =
      typeof content === "string" ? content : JSON.stringify(content, null, 2);

    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
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

    const data = (await res.json()) as { html_url: string };
    if (!res.ok) {
      console.error("❌ Failed to create Gist:", data);
      return null;
    }

    console.log(`✅ Gist created: ${fileName} -  ${data.html_url}`);
    return data.html_url;
  } catch (err) {
    console.error("🚨 Error uploading to Gist:", err);
    return null;
  }
}
