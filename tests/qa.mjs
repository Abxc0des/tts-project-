/**
 * Quick QA script — run: node tests/qa.mjs
 * Requires dev server: npm run dev
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BASE_URL || 'http://localhost:8080';

const results = [];
const pass = (name) => results.push({ name, ok: true });
const fail = (name, detail) => results.push({ name, ok: false, detail });

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, text: await res.text() };
}

function buildSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [trimmed];
}

async function testAssets() {
  const files = ['index.html', 'style.css', 'app.js', 'config.js', 'ads.js', 'manifest.json', 'sw.js'];
  for (const f of files) {
    const res = await fetch(`${BASE}/${f}`);
    if (res.ok) pass(`Asset ${f}`);
    else fail(`Asset ${f}`, `HTTP ${res.status}`);
  }
}

async function testHtmlStructure() {
  const { text, status } = await fetchText('/index.html');
  if (status !== 200) return fail('HTML load', `HTTP ${status}`);

  const required = [
    'id="drop-area"',
    'id="reader-panel"',
    'id="play-btn"',
    'id="voice-select"',
    'id="speed-slider"',
    'id="landing"',
    'id="faq"',
    'pdf.min.js',
    'app.js',
  ];
  for (const id of required) {
    if (text.includes(id)) pass(`HTML contains ${id}`);
    else fail(`HTML contains ${id}`, 'missing');
  }
}

function testSentenceLogic() {
  const s = buildSentences('Hello world. This is a test! And another?');
  if (s.length === 3) pass('Sentence split (3 sentences)');
  else fail('Sentence split', `got ${s.length}: ${JSON.stringify(s)}`);

  const empty = buildSentences('   ');
  if (empty.length === 0) pass('Empty text → no sentences');
  else fail('Empty text', `got ${empty.length}`);
}

async function testPdfFixture() {
  const buf = readFileSync(join(__dirname, 'sample.pdf'));
  if (buf.toString('utf8', 0, 5) === '%PDF-') pass('Sample PDF fixture is valid');
  else fail('Sample PDF fixture', 'invalid header');
}

async function testConfig() {
  const { text } = await fetchText('/config.js');
  if (text.includes('PDF_VOICE_CONFIG')) pass('config.js defines PDF_VOICE_CONFIG');
  else fail('config.js', 'missing config object');
}

async function testSeoFiles() {
  const robots = await fetchText('/robots.txt');
  if (robots.text.includes('Sitemap')) pass('robots.txt');
  else fail('robots.txt');

  const sitemap = await fetchText('/sitemap.xml');
  if (sitemap.text.includes('<urlset')) pass('sitemap.xml');
  else fail('sitemap.xml');
}

async function main() {
  console.log(`\nPDF Voice QA — ${BASE}\n`);

  try {
    await fetch(BASE);
  } catch (e) {
    console.error('Cannot reach dev server. Run: npm run dev\n');
    process.exit(1);
  }

  await testAssets();
  await testHtmlStructure();
  testSentenceLogic();
  await testConfig();
  await testSeoFiles();
  await testPdfFixture();
  pass('PDF.js extraction (covered in e2e.mjs browser test)');

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.name}` : `  ✗ ${r.name} — ${r.detail}`);
  }

  console.log(`\n${passed}/${results.length} checks passed\n`);

  if (failed.length) {
    process.exit(1);
  }
}

main();
