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
- `three-hero.js` / `three-scene.js` — Three.js scenes (hero + scroll-pinned morph)
- `capture.py` — record video + stills of the deployed site (Playwright + ffmpeg)
- `deploy-and-capture.sh` — commit → deploy → record in one shot

## Capture (record video of the site)

```bash
# Record a full scroll-through, desktop + mobile
python3 capture.py --out captures/run-01

# Stills only, faster
python3 capture.py --no-video --out captures/stills

# Custom: 8s scroll, 24fps, 16 analysis frames
python3 capture.py --scroll-duration 8 --fps 24 --frames 16

# End-to-end: commit + deploy + record
bash deploy-and-capture.sh
```

Each run produces `desktop.webm` + `mobile.webm` (scroll-through videos at the
target viewport), 4 stills per viewport (top, bottom, scene@25%, scene@75%),
and N evenly-spaced PNG frames extracted for vision analysis. Output goes to
`captures/run-<timestamp>/` (gitignored).

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
