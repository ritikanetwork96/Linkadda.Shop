import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const mediaMap = new Map();
let observer = null;
let rafId = 0;

// High-quality fallback SVG data URI for broken images
const FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%2314141e"/><g fill="none" stroke="%237c3aed" stroke-width="2"><rect x="90" y="50" width="120" height="100" rx="16"/><circle cx="130" cy="85" r="12"/><path d="M100 135 l25-25 20 20 25-30 20 35"/></g><text x="50%" y="175" fill="%238b8baa" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="600">Linkadda Media</text></svg>';

function stripQuery(value) {
  return String(value || '').trim().split('#')[0].split('?')[0];
}

function safeUrl(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'blob:' || protocol === 'data:') {
      return parsed.href;
    }
  } catch (_) {
    if (/^(\/|\.\/|\.\.\/)/.test(raw)) return raw;
  }
  return fallback;
}

function fileName(value) {
  const clean = stripQuery(value);
  return clean.split('/').filter(Boolean).pop() || '';
}

function normalizeKeys(value) {
  const clean = stripQuery(value);
  if (!clean) return [];
  const keys = new Set();
  const lower = clean.toLowerCase();
  const name = fileName(clean).toLowerCase();
  const withoutLeading = clean.replace(/^\/+/, '').toLowerCase();
  keys.add(lower);
  keys.add(withoutLeading);
  if (name) {
    keys.add(name);
    keys.add(`/${name}`);
  }
  try {
    const url = new URL(clean, window.location.href);
    keys.add(url.pathname.replace(/^\/+/, '').toLowerCase());
    keys.add(url.pathname.toLowerCase());
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length) keys.add(parts[parts.length - 1].toLowerCase());
  } catch (_) {
    // relative path or plain file name
  }
  return [...keys].filter(Boolean);
}

function indexRecord(record) {
  if (!record || typeof record !== 'object') return;
  const publicUrl = stripQuery(safeUrl(record.publicUrl || ''));
  if (!publicUrl) return;
  const candidates = new Set([
    record.publicUrl,
    record.path,
    record.sourcePath,
    record.image,
    record.thumbnail,
    record.cover,
    record.logo,
    record.backgroundImage,
    ...(Array.isArray(record.images) ? record.images : []),
    ...(Array.isArray(record.galleryImages) ? record.galleryImages : []),
  ]);
  candidates.forEach((candidate) => {
    normalizeKeys(candidate).forEach((key) => mediaMap.set(key, publicUrl));
  });
  normalizeKeys(publicUrl).forEach((key) => mediaMap.set(key, publicUrl));
}

function rebuildIndex(records) {
  mediaMap.clear();
  Object.values(records || {}).forEach(indexRecord);
}

function resolveValue(value) {
  const source = stripQuery(safeUrl(value || ''));
  if (!source) return '';
  const candidates = normalizeKeys(source);
  for (const key of candidates) {
    if (mediaMap.has(key)) return mediaMap.get(key);
  }
  return '';
}

function updateImage(el) {
  if (!el) return;

  // Attach error resilience listener if not present
  if (!el.dataset.hasErrHandler) {
    el.dataset.hasErrHandler = 'true';
    el.addEventListener('error', function handleImgErr() {
      const retries = Number(this.dataset.retryCount || 0);
      if (retries >= 2) {
        if (!this.src.startsWith('data:image')) {
          this.src = FALLBACK_SVG;
        }
        return;
      }
      this.dataset.retryCount = String(retries + 1);

      const currentSrc = this.getAttribute('src') || '';
      const resolved = resolveValue(currentSrc);
      if (resolved && resolved !== currentSrc) {
        this.src = resolved;
      } else if (currentSrc && !currentSrc.startsWith('data:image')) {
        const joiner = currentSrc.includes('?') ? '&' : '?';
        this.src = `${currentSrc}${joiner}_r=${Date.now()}`;
      } else {
        this.src = FALLBACK_SVG;
      }
    });
  }

  const current = el.getAttribute('src') || '';
  const next = resolveValue(current);
  if (next && next !== current) {
    el.setAttribute('src', next);
  }
}

function syncDocument() {
  document.querySelectorAll('img, source').forEach(updateImage);
}

function scheduleSync() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    syncDocument();
  });
}

// Global capture error listener for image load failures
if (typeof document !== 'undefined') {
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      updateImage(e.target);
    }
  }, true);
}

function startResolver(db) {
  if (!db || window.__mediaResolverActive) return;
  window.__mediaResolverActive = true;

  try {
    onValue(ref(db, 'media'), (snap) => {
      rebuildIndex(snap.val() || {});
      scheduleSync();
    });

    if (!observer) {
      observer = new MutationObserver(() => scheduleSync());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    scheduleSync();
  } catch (e) {
    console.warn('Media resolver init warning:', e);
  }
}

function checkAndInit() {
  const db = window.__linkaddaDb || window._fbDB;
  if (db) {
    startResolver(db);
  } else {
    window.addEventListener('linkadda-firebase-ready', () => {
      const readyDb = window.__linkaddaDb || window._fbDB;
      if (readyDb) startResolver(readyDb);
    }, { once: true });

    let tries = 0;
    const interval = setInterval(() => {
      tries++;
      const currentDb = window.__linkaddaDb || window._fbDB;
      if (currentDb) {
        clearInterval(interval);
        startResolver(currentDb);
      } else if (tries > 20) {
        clearInterval(interval);
      }
    }, 250);
  }
}

checkAndInit();
