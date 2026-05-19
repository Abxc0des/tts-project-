# PDF Voice

**Free, private PDF text-to-speech — entirely in your browser.**

Upload a PDF, press play, and listen. No signup, no server uploads, no API keys, no paywalls.

## Build status (3-day plan)

| Day | Status | Includes |
|-----|--------|----------|
| **Day 1** | Done | PDF upload, text extraction, TTS play/pause/stop, speed, voices, pages, progress bar |
| **Day 2** | Done | Sentence highlight, page jump, dark/light theme, keyboard shortcuts, auto next page, toasts, mobile UI, errors |
| **Day 3** | Done | SEO meta + JSON-LD, `robots.txt`, `sitemap.xml`, `og-image.svg`, landing + FAQ, share, PWA, AdSense hooks, `LAUNCH.md` |

**Your manual steps:** deploy to Netlify, apply for AdSense, submit to directories — see **[LAUNCH.md](./LAUNCH.md)**.

## Why it exists

Most PDF TTS tools online are paywalled, slow, or send your files to a server. PDF Voice runs 100% client-side using [PDF.js](https://mozilla.github.io/pdf.js/) for text extraction and the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) for narration.

## Tech stack

- **PDF.js** (CDN) — parse PDFs in the browser
- **Web Speech API** (`speechSynthesis`) — free system voices
- **HTML + CSS + Vanilla JS** — no framework, no build step
- **Netlify** — static hosting (`netlify.toml` included)

## Run locally

```bash
npm run dev
```

Opens at **http://localhost:8080** (or the next free port — check the terminal).

## Features

- Drag-and-drop or click to upload PDFs
- Page-by-page reading with prev/next navigation and page jump
- Play, pause, resume, and stop controls
- Adjustable speed and voice selection (saved in `localStorage`)
- Sentence highlighting synced with speech
- Auto-advance to the next page when a page finishes
- Keyboard shortcuts: Space (play/pause), ←/→ (pages), Esc (stop)
- Dark / light theme, PWA install, share button
- Remembers last page per PDF filename

## Browser support

Works best in **Chrome** and **Edge** (most voices). Safari and Firefox are supported; scanned/image-only PDFs cannot be read without OCR (planned).

## Deploy

See **[LAUNCH.md](./LAUNCH.md)** for Netlify deploy, AdSense, SEO, and submission checklist.

## Project structure

```
├── index.html      # App + landing + FAQ
├── style.css       # Dark/light design system
├── app.js          # PDF.js + TTS logic
├── config.js       # Site URL + AdSense client (edit after deploy)
├── ads.js          # AdSense loader (auto-runs when configured)
├── manifest.json   # PWA manifest
├── sw.js           # Service worker
├── og-image.svg    # Social preview image
├── robots.txt
├── sitemap.xml
├── LAUNCH.md       # Day 3 launch checklist
└── scripts/serve.py
```

## Contributing

Pull requests welcome. Keep the stack vanilla (no frameworks) unless discussed in an issue first.

## License

MIT — see [LICENSE](./LICENSE).
