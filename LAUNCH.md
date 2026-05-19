# PDF Voice — Day 3 Launch Checklist

Use this after the app works locally (`npm run dev`).

## 1. Deploy to Netlify

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire project folder (not just `index.html`)
3. Copy your live URL (e.g. `https://pdf-voice-abc123.netlify.app`)

### Update your live URL in these files

| File | What to change |
|------|----------------|
| `config.js` | `siteUrl` |
| `index.html` | `og:url`, `canonical`, JSON-LD `url` |
| `robots.txt` | `Sitemap:` line |
| `sitemap.xml` | `<loc>` |

4. Optional: **Site settings → Domain management** → add custom domain
5. Optional: **Analytics** → enable Netlify Analytics (privacy-friendly, no cookies)

`netlify.toml` is already configured for static deploy.

---

## 2. Google AdSense

1. Apply at [adsense.google.com](https://adsense.google.com) with your Netlify URL
2. Wait for approval (often 1–3 days for new sites)
3. In `config.js`, set `adsenseClient: 'ca-pub-XXXXXXXX'`
4. In `index.html`, uncomment the two `<ins class="adsbygoogle">` blocks inside `.ad-slot-controls` and `.ad-slot-faq`
5. Replace `ca-pub-XXXXXXXX` and `data-ad-slot` with values from your AdSense dashboard
6. Redeploy to Netlify

**Ad placement (already in the app):**

- Below TTS controls (high viewability while listening)
- Above FAQ on the landing section (non-intrusive)

Do **not** add ads above the upload zone.

---

## 3. SEO verification

- [ ] Open live site → View source → confirm title, description, canonical
- [ ] Test share preview: [opengraph.xyz](https://www.opengraph.xyz/)
- [ ] Submit sitemap in [Google Search Console](https://search.google.com/search-console)
- [ ] Add property with your Netlify URL

Files included: `robots.txt`, `sitemap.xml`, `og-image.svg`, JSON-LD in `index.html`.

---

## 4. GitHub (credibility + backlink)

```bash
git init
git add .
git commit -m "Initial release: PDF Voice free PDF TTS"
git branch -M main
git remote add origin https://github.com/YOUR_USER/pdf-voice.git
git push -u origin main
```

---

## 5. Submission list (all free)

| Platform | URL | Notes |
|----------|-----|-------|
| Futurepedia | [futurepedia.io/submit](https://www.futurepedia.io/submit) | AI tool directory |
| There's An AI For That | [theresanaiforthat.com/submit](https://theresanaiforthat.com/submit/) | High traffic |
| Product Hunt | [producthunt.com](https://www.producthunt.com/) | Schedule Tuesday 12:01 AM PT |
| AlternativeTo | [alternativeto.net](https://alternativeto.net/) | Tag: NaturalReader, Speechify alternative |
| Hacker News | [news.ycombinator.com/submit](https://news.ycombinator.com/submit) | Title: *Show HN: Free browser-based PDF TTS — no server, no API* |
| Reddit r/productivity | — | *Built a free PDF reader tool, no signup needed* |
| Reddit r/selfhosted | — | Emphasize client-side privacy |

---

## 6. Success metrics (30-day targets)

| Metric | Tool | Target |
|--------|------|--------|
| Daily users | Netlify Analytics | 100+ |
| AdSense RPM | AdSense dashboard | Track after approval |
| Backlinks | Google Search Console | 10+ |
| Product Hunt upvotes | Product Hunt | 50+ |

---

## Post-launch (Week 2+)

- OCR for scanned PDFs (Tesseract.js)
- Chrome extension
- Premium voice upsell (optional)
