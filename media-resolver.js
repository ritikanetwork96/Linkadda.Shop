import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const db = window.__linkaddaDb;
if (!db) {
  console.warn('Media resolver skipped: Firebase DB not ready');
}

const mediaMap = new Map();
let observer = null;
let rafId = 0;

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
  const current = el.getAttribute('src') || '';
  const next = resolveValue(current);
  if (!next || next === current) return;
  el.setAttribute('src', next);
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

if (db) {
  onValue(ref(db, 'media'), (snap) => {
    rebuildIndex(snap.val() || {});
    scheduleSync();
  });

  observer = new MutationObserver(() => scheduleSync());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  } else {
    scheduleSync();
  }
}
