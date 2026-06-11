# wiseamos · portfolio 2026

A personal portfolio for Amos. Static site, no framework — HTML / CSS / JS, GSAP via CDN, served from Vercel.

## Run locally

```bash
npm run dev
# → http://localhost:3000
```

## Structure

- `index.html` — single page
- `styles.css` — design system + layout
- `app.js` — interactions (hero canvas, cursor glow, scroll reveals)
- `projects.js` — curated list of repos featured on the page

## Deploy

Push to `main` → Vercel auto-deploys.

Or, from CLI:

```bash
vercel --prod
```

## Design notes

Inspired by recent Awwwards SOTD winners (makemepulse's *Apechain*, June 2026).
Dark base, electric-lime accent, oversized display type, GPU-friendly canvas hero,
GSAP scroll-triggered reveals, custom cursor glow, grain overlay.

All projects link to public GitHub repos.
