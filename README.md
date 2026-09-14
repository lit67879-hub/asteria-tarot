# ASTERIA

ASTERIA is a static tarot reflection interface. The site is hosted on GitHub Pages and its AI endpoint is a Cloudflare Pages Function backed by Cloudflare Workers AI.

## Deployment layout

- GitHub Pages serves the files in this directory.
- `worker.js` contains the shared API handler used by the Pages Function.
- `functions/api/[[path]].js` exposes that handler at the Pages deployment.
- `api-config.js` contains the public Pages Function URL for the published site. Keep it empty for local development.

## Worker configuration

Set these Pages variables/bindings in Cloudflare:

- AI binding `AI`: Cloudflare Workers AI.
- Variable `AI_MODEL`: optional; defaults to `@cf/qwen/qwen3-30b-a3b-fp8`.
- Variable `ALLOWED_ORIGIN`: the GitHub Pages origin only, for example `https://your-name.github.io` (do not include `/asteria-tarot`).
