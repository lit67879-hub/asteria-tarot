# ASTERIA

ASTERIA is a static tarot reflection interface. The site is hosted on GitHub Pages and its AI endpoint is a Cloudflare Worker backed by Gemini.

## Deployment layout

- GitHub Pages serves the files in this directory.
- `worker.js` is deployed separately as a Cloudflare Worker.
- `api-config.js` contains the Worker URL for the published site. Keep it empty for local development.

## Worker configuration

Set these Worker variables/secrets in Cloudflare:

- Secret `GEMINI_API_KEY`: the key from Google AI Studio.
- Variable `GEMINI_MODEL`: optional; defaults to `gemini-2.5-flash`.
- Variable `ALLOWED_ORIGIN`: the exact GitHub Pages URL, for example `https://your-name.github.io/asteria-tarot`.

Never put the Gemini key in `app.js`, `api-config.js`, or any GitHub file.
