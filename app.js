/* PDF Voice — client-side PDF text-to-speech */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- State ---
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let pageTexts = [];
let currentFileName = '';

let utterance = null;
let isSpeaking = false;
let isPaused = false;
let sentences = [];
let currentSentenceIdx = 0;
let autoAdvancePending = false;

// --- DOM refs ---
const $ = (id) => document.getElementById(id);

const uploadZone = $('upload-zone');
const readerPanel = $('reader-panel');
const dropArea = $('drop-area');
const fileInput = $('file-input');
const browseBtn = $('browse-btn');
const changeFileBtn = $('change-file-btn');
const textContent = $('text-content');
const playBtn = $('play-btn');
const pauseBtn = $('pause-btn');
const stopBtn = $('stop-btn');
const prevBtn = $('prev-btn');
const nextBtn = $('next-btn');
const speedSlider = $('speed-slider');
const speedVal = $('speed-val');
const voiceSelect = $('voice-select');
const pageJump = $('page-jump');
const themeToggle = $('theme-toggle');
const shareBtn = $('share-btn');
const speechWarning = $('speech-warning');

// --- Toast ---
function toast(message, type = 'info') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// --- Theme ---
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  themeToggle.textContent = light ? '☀️' : '🌙';
  localStorage.setItem('pdfvoice-theme', light ? 'light' : 'dark');
}

function initTheme() {
  const saved = localStorage.getItem('pdfvoice-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved === 'light' || (!saved && prefersLight));
}

themeToggle.addEventListener('click', () => {
  applyTheme(!document.body.classList.contains('light'));
});

// --- Speech API check ---
function checkSpeechSupport() {
  if (!('speechSynthesis' in window)) {
    speechWarning.classList.remove('hidden');
    playBtn.disabled = true;
    return false;
  }
  return true;
}

// --- Pinned Voice Presets (Samantha & Moira) ---
const VOICE_PRESETS = [
  {
    id: 'preset-samantha',
    exactName: 'Samantha',
    label: 'Samantha (Our Choice)',
  },
  {
    id: 'preset-moira',
    exactName: 'Moira',
    label: 'Moira (Our Choice)',
  },
];

function findPresetVoice(preset, voices) {
  return voices.find((v) => v.name === preset.exactName) || null;
}

// --- Voices ---
function getSelectedVoice() {
  const voices = window.speechSynthesis.getVoices();
  const val = voiceSelect.value;

  const preset = VOICE_PRESETS.find((p) => p.id === val);
  if (preset) {
    return findPresetVoice(preset, voices)
        || voices.find((v) => v.lang.startsWith('en'))
        || voices[0] || null;
  }

  const idx = parseInt(val, 10);
  if (!isNaN(idx) && voices[idx]) return voices[idx];
  return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
}

function populateVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;

  const prev = voiceSelect.value;
  voiceSelect.innerHTML = '';

  // --- Pinned presets at the top ---
  const presetsGroup = document.createElement('optgroup');
  presetsGroup.label = '📌 Pinned Voices';
  VOICE_PRESETS.forEach((preset) => {
    const resolved = findPresetVoice(preset, voices);
    if (!resolved) return; // only show if voice actually exists on this system
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = preset.label;
    presetsGroup.appendChild(opt);
  });
  if (presetsGroup.childElementCount > 0) {
    voiceSelect.appendChild(presetsGroup);
  }

  // --- All system voices ---
  const systemGroup = document.createElement('optgroup');
  systemGroup.label = '🖥 All System Voices';

  const sorted = [...voices].sort((a, b) => {
    const aEn = a.lang.startsWith('en') ? 0 : 1;
    const bEn = b.lang.startsWith('en') ? 0 : 1;
    return aEn - bEn || a.name.localeCompare(b.name);
  });

  sorted.forEach((v) => {
    const realIdx = voices.indexOf(v);
    const opt = document.createElement('option');
    opt.value = realIdx;
    opt.textContent = `${v.name} (${v.lang})`;
    systemGroup.appendChild(opt);
  });
  voiceSelect.appendChild(systemGroup);

  // Restore previous selection or default to first pinned preset
  if (prev && [...voiceSelect.options].some((o) => o.value === prev)) {
    voiceSelect.value = prev;
  } else {
    const firstPreset = [...voiceSelect.options].find((o) =>
      VOICE_PRESETS.some((p) => p.id === o.value)
    );
    voiceSelect.value = firstPreset ? firstPreset.value : voiceSelect.options[0]?.value;
  }
  restoreVoicePreference();
}

if ('speechSynthesis' in window) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}

// --- Sentence helpers ---
function buildSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [trimmed];
}

function renderSentences(sentenceList) {
  textContent.innerHTML = '';
  sentenceList.forEach((s, i) => {
    const span = document.createElement('span');
    span.className = 'sentence';
    span.id = `sentence-${i}`;
    span.textContent = s + (i < sentenceList.length - 1 ? ' ' : '');
    textContent.appendChild(span);
  });
}

function highlightSentence(idx) {
  document.querySelectorAll('#text-content .sentence').forEach((el) => {
    el.classList.remove('highlight');
  });
  const el = document.getElementById(`sentence-${idx}`);
  if (el) {
    el.classList.add('highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function resetHighlight() {
  document.querySelectorAll('#text-content .sentence').forEach((el) => {
    el.classList.remove('highlight');
  });
}

function updateProgress() {
  const pct = sentences.length ? (currentSentenceIdx / sentences.length) * 100 : 0;
  $('progress-bar').style.width = pct + '%';
}

function setPlayPauseUI(playing, paused = false) {
  if (playing && !paused) {
    playBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
  } else {
    playBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    playBtn.textContent = paused ? '▶ Resume' : '▶ Play';
  }
}

// --- TTS engine ---
function speakFrom(idx) {
  if (idx >= sentences.length) {
    isSpeaking = false;
    setPlayPauseUI(false);
    updateProgress();

    if (currentPage < totalPages) {
      autoAdvancePending = true;
      const next = currentPage + 1;
      toast(`Reading page ${next}…`, 'info');
      setTimeout(async () => {
        await loadPage(next);
        autoAdvancePending = false;
        if (sentences.length) play(true);
      }, 1000);
    } else {
      toast('Finished reading document.', 'success');
    }
    return;
  }

  window.speechSynthesis.cancel();

  currentSentenceIdx = idx;
  highlightSentence(idx);
  updateProgress();

  utterance = new SpeechSynthesisUtterance(sentences[idx]);
  utterance.rate = parseFloat(speedSlider.value);
  utterance.voice = getSelectedVoice();

  utterance.onstart = () => {
    isSpeaking = true;
    isPaused = false;
    setPlayPauseUI(true);
  };

  utterance.onend = () => {
    if (!isPaused) {
      currentSentenceIdx++;
      speakFrom(currentSentenceIdx);
    }
  };

  utterance.onerror = (e) => {
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      toast('Speech error. Try a different voice.', 'error');
    }
    isSpeaking = false;
    setPlayPauseUI(false);
  };

  window.speechSynthesis.speak(utterance);
}

function play(auto = false) {
  if (!checkSpeechSupport()) return;
  if (!sentences.length) {
    toast('No text to read on this page.', 'error');
    return;
  }

  if (isPaused && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    isPaused = false;
    setPlayPauseUI(true);
    if (!auto) toast('Resumed reading.', 'info');
    return;
  }

  if (isSpeaking && !isPaused) return;

  if (!auto) toast('Started reading.', 'info');
  speakFrom(currentSentenceIdx);
}

function pause() {
  if (!isSpeaking) return;
  window.speechSynthesis.pause();
  isPaused = true;
  setPlayPauseUI(true, true);
  toast('Paused.', 'info');
}

function stop() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  isPaused = false;
  currentSentenceIdx = 0;
  utterance = null;
  resetHighlight();
  updateProgress();
  setPlayPauseUI(false);
  playBtn.textContent = '▶ Play';
}

function resetTTS() {
  stop();
  sentences = buildSentences(pageTexts[currentPage - 1] || '');
  renderSentences(sentences);
  updateProgress();
}

// --- PDF ---
async function extractPageText(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const textContentObj = await page.getTextContent();
  return textContentObj.items.map((item) => item.str).join(' ').trim();
}

async function isDocumentScanned() {
  const sample = Math.min(3, totalPages);
  let withText = 0;
  for (let i = 1; i <= sample; i++) {
    if (pageTexts[i - 1] === null) {
      pageTexts[i - 1] = await extractPageText(i);
    }
    if (pageTexts[i - 1]) withText++;
  }
  return withText === 0;
}

async function loadPDF(file) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    toast('Please upload a PDF file.', 'error');
    return;
  }

  try {
    toast('Loading PDF…', 'info');
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdfDoc.numPages;
    pageTexts = new Array(totalPages).fill(null);
    currentFileName = file.name;

    $('file-name').textContent = currentFileName;
    $('total-pages').textContent = totalPages;
    pageJump.max = totalPages;
    pageJump.placeholder = `1–${totalPages}`;

    uploadZone.classList.add('hidden');
    readerPanel.classList.remove('hidden');

    let startPage = 1;
    try {
      const saved = JSON.parse(localStorage.getItem('pdfvoice-last-page') || '{}');
      if (saved.file === currentFileName && saved.page >= 1 && saved.page <= totalPages) {
        startPage = saved.page;
      }
    } catch { /* ignore */ }

    await loadPage(startPage);

    const scanned = await isDocumentScanned();
    if (scanned) {
      toast('This PDF appears to be scanned. Text extraction is not available.', 'error');
    }

    const pageNote = startPage > 1 ? ` Resumed at page ${startPage}.` : '';
    toast(`Loaded "${currentFileName}" (${totalPages} pages).${pageNote}`, 'success');
  } catch (err) {
    console.error(err);
    if (err?.name === 'PasswordException' || /password/i.test(err?.message)) {
      toast('This PDF is password-protected. Try an unlocked version.', 'error');
    } else {
      toast('Could not load PDF. The file may be corrupted.', 'error');
    }
  }
}

async function loadPage(pageNum) {
  if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;

  stop();

  if (pageTexts[pageNum - 1] === null) {
    pageTexts[pageNum - 1] = await extractPageText(pageNum);
  }

  currentPage = pageNum;
  $('current-page').textContent = pageNum;
  pageJump.value = '';

  if (currentFileName) {
    localStorage.setItem(
      'pdfvoice-last-page',
      JSON.stringify({ file: currentFileName, page: pageNum })
    );
  }

  const text = pageTexts[pageNum - 1];
  if (!text) {
    textContent.innerHTML = '<p style="color:var(--text-muted)">This page has no extractable text. It may be a scanned image.</p>';
    sentences = [];
    toast('This PDF appears to be scanned. Text extraction is not available on this page.', 'error');
  } else {
    resetTTS();
  }

  updateProgress();
}

async function prevPage() {
  if (currentPage > 1) {
    const target = currentPage - 1;
    await loadPage(target);
    toast(`Page ${target}`, 'info');
  }
}

async function nextPage() {
  if (currentPage < totalPages) {
    const target = currentPage + 1;
    await loadPage(target);
    toast(`Page ${target}`, 'info');
  }
}

function showUploadZone() {
  stop();
  pdfDoc = null;
  pageTexts = [];
  currentPage = 1;
  totalPages = 0;
  fileInput.value = '';
  readerPanel.classList.add('hidden');
  uploadZone.classList.remove('hidden');
}

// --- File upload ---
function handleFile(file) {
  if (file) loadPDF(file);
}

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dropArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

changeFileBtn.addEventListener('click', showUploadZone);

// --- Controls ---
playBtn.addEventListener('click', () => play());
pauseBtn.addEventListener('click', pause);
stopBtn.addEventListener('click', stop);
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

speedSlider.addEventListener('input', (e) => {
  speedVal.textContent = e.target.value + 'x';
  localStorage.setItem('pdfvoice-speed', e.target.value);
  if (utterance) utterance.rate = parseFloat(e.target.value);
});

voiceSelect.addEventListener('change', () => {
  localStorage.setItem('pdfvoice-voice', voiceSelect.value);
});

function loadPreferences() {
  const speed = localStorage.getItem('pdfvoice-speed');
  if (speed) {
    speedSlider.value = speed;
    speedVal.textContent = speed + 'x';
  }
}

function restoreVoicePreference() {
  const saved = localStorage.getItem('pdfvoice-voice');
  if (saved && [...voiceSelect.options].some((o) => o.value === saved)) {
    voiceSelect.value = saved;
  }
}

pageJump.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const num = parseInt(pageJump.value, 10);
  if (isNaN(num) || num < 1 || num > totalPages) {
    toast(`Enter a page between 1 and ${totalPages}.`, 'error');
    return;
  }
  loadPage(num);
  toast(`Jumped to page ${num}.`, 'info');
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (!readerPanel.classList.contains('hidden')) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (isSpeaking && !isPaused) pause();
      else play();
    }
    if (e.code === 'ArrowRight') nextPage();
    if (e.code === 'ArrowLeft') prevPage();
    if (e.code === 'Escape') stop();
  }
});

// --- Share ---
shareBtn.addEventListener('click', async () => {
  const shareData = {
    title: 'PDF Voice — Free PDF Text to Speech',
    text: 'Listen to any PDF for free. No signup. No upload.',
    url: window.location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard!', 'success');
    }
  } catch {
    /* user cancelled share */
  }
});

// --- PWA install ---
let deferredInstallPrompt = null;
const installBtn = $('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') toast('App installed!', 'success');
  deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
});

// --- PWA service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// --- Init ---
$('year').textContent = new Date().getFullYear();
initTheme();
loadPreferences();
checkSpeechSupport();
