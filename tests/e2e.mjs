/**
 * Browser E2E smoke test — run: node tests/e2e.mjs
 */
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SAMPLE_PDF = join(__dirname, 'sample.pdf');

const log = [];
const ok = (m) => log.push(`✓ ${m}`);
const bad = (m, e) => log.push(`✗ ${m}${e ? ` — ${e}` : ''}`);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    ok('Page loads');

    await page.waitForSelector('#drop-area', { state: 'visible' });
    ok('Upload zone visible');

    const hidden = await page.locator('#reader-panel').isHidden();
    if (hidden) ok('Reader panel hidden initially');
    else bad('Reader panel should be hidden initially');

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(SAMPLE_PDF);
    await page.waitForSelector('#reader-panel:not(.hidden)', { timeout: 10000 });
    ok('PDF upload shows reader panel');

    await page.waitForFunction(
      () => {
        const el = document.getElementById('text-content');
        return el && el.textContent.trim().length > 10;
      },
      { timeout: 10000 }
    );
    const text = await page.locator('#text-content').textContent();
    if (text.includes('Hello PDF Voice')) ok('PDF text extracted and displayed');
    else bad('PDF text display', `got: ${text?.slice(0, 80)}`);

    const totalPages = await page.locator('#total-pages').textContent();
    if (totalPages === '1') ok('Page count shows 1');
    else bad('Page count', totalPages);

    await page.click('#play-btn');
    await page.waitForTimeout(500);
    const pauseVisible = await page.locator('#pause-btn').isVisible();
    if (pauseVisible) ok('Play switches to Pause');
    else bad('Play/Pause UI');

    await page.click('#pause-btn');
    await page.waitForTimeout(300);
    const playBack = await page.locator('#play-btn').isVisible();
    if (playBack) ok('Pause returns to Play/Resume');
    else bad('Pause control');

    await page.click('#stop-btn');
    await page.waitForTimeout(200);
    ok('Stop button clickable');

    await page.locator('#speed-slider').fill('1.5');
    const speedLabel = await page.locator('#speed-val').textContent();
    if (speedLabel === '1.5x') ok('Speed slider updates label');
    else bad('Speed slider', speedLabel);

    const voiceCount = await page.locator('#voice-select option').count();
    if (voiceCount > 0) ok(`Voice selector has ${voiceCount} voices`);
    else bad('Voice selector empty');

    const lightBefore = await page.evaluate(() => document.body.classList.contains('light'));
    await page.click('#theme-toggle');
    const lightAfter = await page.evaluate(() => document.body.classList.contains('light'));
    if (lightBefore !== lightAfter) ok('Theme toggle switches light/dark');
    else bad('Theme toggle', 'class did not change');

    await page.click('#change-file-btn');
    await page.waitForSelector('#upload-zone:not(.hidden)');
    ok('Change file returns to upload');

    await page.locator('#faq').scrollIntoViewIfNeeded();
    const faqVisible = await page.locator('#faq').isVisible();
    if (faqVisible) ok('FAQ section reachable');
    else bad('FAQ section');

    const hasHighlight = await page.evaluate(() =>
      document.querySelector('#text-content .sentence') !== null
    );
    // Re-upload for highlight check
    await fileInput.setInputFiles(SAMPLE_PDF);
    await page.waitForSelector('#reader-panel:not(.hidden)');
    await page.waitForFunction(
      () => document.querySelectorAll('#text-content .sentence').length > 0,
      { timeout: 8000 }
    );
    ok('Sentences wrapped in spans for highlighting');

    const speechSupported = await page.evaluate(() => 'speechSynthesis' in window);
    if (speechSupported) ok('Web Speech API available in browser');
    else bad('Web Speech API missing');
  } catch (err) {
    bad('E2E run', err.message);
  } finally {
    await browser.close();
  }

  console.log('\nPDF Voice E2E (browser)\n');
  log.forEach((l) => console.log(`  ${l}`));
  const fails = log.filter((l) => l.startsWith('✗'));
  console.log(`\n${log.length - fails.length}/${log.length} passed\n`);
  process.exit(fails.length ? 1 : 0);
}

main();
