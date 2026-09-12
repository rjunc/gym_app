# Session Log

A workout session/routine journal built with React + Vite. Data is stored locally in the browser (`localStorage`), so it's per-device/per-browser and never leaves the device.

## Develop locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

**Option A — via the Vercel dashboard**
1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects the Vite framework preset — just click Deploy (no config needed).

**Option B — via CLI**
```bash
npm install -g vercel
vercel
```
Follow the prompts; Vercel will detect the Vite build automatically (`npm run build`, output dir `dist`).
