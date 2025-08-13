# Nextra Docs Template

This is a template for creating documentation with [Nextra](https://nextra.site).

[**Live Demo →**](https://docs.geobase.app/geoai)

[![](.github/screenshot.png)](https://docs.geobase.app/geoai)

## Quick Start

Click the button to clone this repository and deploy it on Vercel:

[![](https://vercel.com/button)](https://vercel.com/new/clone?s=https%3A%2F%2Fgithub.com%2Fshuding%2Fnextra-docs-template&showOptionalTeamCreation=false)

## Local Development (with basePath)

First, run `pnpm i` to install the dependencies.

Then, run the dev server and open the site under the `/geoai` base path:

```
pnpm dev -p 3000
# Open:
http://localhost:3000/geoai
```

Notes
- This app is configured with `basePath: '/geoai'` and `assetPrefix: '/geoai'` in `next.config.ts`.
- In production it will be served at `https://docs.geobase.app/geoai`.

## License

This project is licensed under the MIT License.

## TODOs

- Organize Developer Frameworks into a table

