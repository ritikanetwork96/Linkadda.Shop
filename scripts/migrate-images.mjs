import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const HTML_FILES = ['index.html', 'payment.html'];
const ENV_PATH = path.join(ROOT, '.env');

function parseEnv(text) {
  const result = {};
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index < 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      result[key] = value;
    });
  return result;
}

async function loadEnv() {
  try {
    const raw = await readFile(ENV_PATH, 'utf8');
    return parseEnv(raw);
  } catch (_) {
    return {};
  }
}

function stripQuery(value) {
  return String(value || '').trim().split('#')[0].split('?')[0];
}

function fileName(value) {
  const clean = stripQuery(value);
  return clean.split('/').filter(Boolean).pop() || '';
}

function looksLikeImage(value) {
  const clean = stripQuery(value).toLowerCase();
  if (!clean || clean.startsWith('data:') || clean.startsWith('blob:')) return false;
  return (
    /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(clean) ||
    clean.includes('/images/') ||
    clean.includes('upi-icon')
  );
}

function extractRefs(html) {
  const refs = new Set();
  const attrRegex = /\b(?:src|poster|data-src|data-lazy|data-original|href)\s*=\s*["']([^"'<>]+)["']/gi;
  const urlRegex = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  let match;
  while ((match = attrRegex.exec(html))) {
    const value = match[1];
    if (looksLikeImage(value)) refs.add(stripQuery(value));
  }
  while ((match = urlRegex.exec(html))) {
    const value = match[2];
    if (looksLikeImage(value)) refs.add(stripQuery(value));
  }
  return [...refs];
}

function guessFolder(ref) {
  const clean = stripQuery(ref).toLowerCase();
  const name = fileName(clean).toLowerCase();
  if (clean.includes('category') || name.includes('category')) return 'categories';
  if (clean.includes('photo_') || clean.includes('product') || name.startsWith('photo_') || name.includes('product')) return 'products';
  if (clean.includes('binance') || clean.includes('paypal') || clean.includes('upi') || clean.includes('logo') || name.includes('binance') || name.includes('paypal') || name.includes('upi')) return 'logos';
  if (clean.includes('hero') || name.includes('hero')) return 'hero';
  if (clean.includes('banner') || name.includes('banner')) return 'banners';
  if (clean.includes('testimonial') || clean.includes('review') || clean.includes('avatar') || name.includes('testimonial') || name.includes('review')) return 'testimonials';
  return 'images';
}

function normalizeStoragePath(value) {
  return stripQuery(value).replace(/^\/+/, '');
}

function stableId(value) {
  return `media_${crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 16)}`;
}

function uniqueByKey(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeKeys(value) {
  const clean = stripQuery(value);
  if (!clean) return [];
  const keys = new Set();
  const lower = clean.toLowerCase();
  const noLead = clean.replace(/^\/+/, '').toLowerCase();
  const name = fileName(clean).toLowerCase();
  keys.add(lower);
  keys.add(noLead);
  if (name) {
    keys.add(name);
    keys.add(`/${name}`);
  }
  try {
    const url = new URL(clean, 'https://example.com');
    keys.add(url.pathname.toLowerCase());
    keys.add(url.pathname.replace(/^\/+/, '').toLowerCase());
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length) keys.add(parts[parts.length - 1].toLowerCase());
  } catch (_) {
    // ignore
  }
  return [...keys].filter(Boolean);
}

async function httpJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }
  if (!response.ok) {
    throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  }
  return data;
}

function rtdbUrl(baseUrl, node, token) {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${node}.json`);
  if (token) url.searchParams.set('auth', token);
  return url.toString();
}

async function firebaseLogin({ apiKey, email, password }) {
  const data = await httpJson(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  if (!data?.idToken) throw new Error('Firebase login failed');
  return data.idToken;
}

async function fetchNode(baseUrl, node, token) {
  return httpJson(rtdbUrl(baseUrl, node, token), { method: 'GET', headers: { Accept: 'application/json' } });
}

async function patchNode(baseUrl, node, token, payload) {
  return httpJson(rtdbUrl(baseUrl, node, token), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function putNode(baseUrl, node, token, payload) {
  return httpJson(rtdbUrl(baseUrl, node, token), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function uploadToSupabase({ supabaseUrl, anonKey, bucket, folder, name, buffer, mime }) {
  const storagePath = `${folder}/${name}`;
  const url = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURI(storagePath)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'x-upsert': 'true',
      'Content-Type': mime || 'application/octet-stream',
    },
    body: buffer,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || 'Supabase upload failed');
  }
  return {
    path: storagePath,
    publicUrl: `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURI(storagePath)}`,
  };
}

async function readSourceAsset(ref) {
  const clean = normalizeStoragePath(ref);
  if (!clean) throw new Error('Empty asset reference');
  if (/^(https?:)?\/\//i.test(clean)) {
    const response = await fetch(clean);
    if (!response.ok) throw new Error(`Failed to download ${clean}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      mime: response.headers.get('content-type') || 'application/octet-stream',
      name: fileName(clean) || 'asset',
    };
  }
  const localPath = path.resolve(ROOT, clean.startsWith('/') ? `.${clean}` : clean);
  const file = await readFile(localPath);
  const mime = clean.endsWith('.png')
    ? 'image/png'
    : clean.endsWith('.jpg') || clean.endsWith('.jpeg')
      ? 'image/jpeg'
      : clean.endsWith('.webp')
        ? 'image/webp'
        : clean.endsWith('.gif')
          ? 'image/gif'
          : clean.endsWith('.svg')
            ? 'image/svg+xml'
            : 'application/octet-stream';
  return {
    buffer: file,
    mime,
    name: fileName(clean) || path.basename(clean),
  };
}

function buildMediaRecord(originalRef, uploaded, source = 'migration') {
  return {
    id: stableId(originalRef),
    name: fileName(originalRef) || fileName(uploaded.path),
    folder: uploaded.path.split('/')[0] || 'images',
    type: 'image',
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    sourcePath: stripQuery(originalRef),
    source,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function replaceInHtml(html, mapping) {
  let output = html;
  [...mapping.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([from, to]) => {
      if (!from || !to || from === to) return;
      output = output.split(from).join(to);
    });
  return output;
}

function transformValue(value, mapping) {
  if (Array.isArray(value)) return value.map((item) => transformValue(item, mapping));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, next] of Object.entries(value)) out[key] = transformValue(next, mapping);
    return out;
  }
  if (typeof value !== 'string') return value;
  const exact = mapping.get(stripQuery(value));
  if (exact) return exact;
  const candidates = normalizeKeys(value);
  for (const key of candidates) {
    if (mapping.has(key)) return mapping.get(key);
  }
  return value;
}

function transformCollection(collection, mapping) {
  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
    return transformValue(collection, mapping);
  }
  const out = {};
  for (const [key, value] of Object.entries(collection)) {
    out[key] = transformValue(value, mapping);
  }
  return out;
}

async function main() {
  const env = await loadEnv();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  const bucket = env.SUPABASE_BUCKET || 'media';
  const firebaseApiKey = env.FIREBASE_API_KEY || env.apiKey || 'AIzaSyCD_cZXyfYd01FNg-DmRpyKKBIGR3NqeT4';
  const firebaseDbUrl = env.FIREBASE_DATABASE_URL || env.databaseURL || 'https://linkadda-cd1da-default-rtdb.firebaseio.com';
  const firebaseEmail = env.admin || env.ADMIN_EMAIL;
  const firebasePassword = env.password || env.ADMIN_PASSWORD;

  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase configuration in .env');
  if (!firebaseEmail || !firebasePassword) throw new Error('Missing Firebase admin credentials in .env');

  const token = await firebaseLogin({ apiKey: firebaseApiKey, email: firebaseEmail, password: firebasePassword });
  const existingMedia = await fetchNode(firebaseDbUrl, 'media', token).catch(() => ({}));
  const existingMediaMap = new Map();
  Object.values(existingMedia || {}).forEach((item) => {
    if (!item || typeof item !== 'object') return;
    [
      item.publicUrl,
      item.path,
      item.sourcePath,
      item.image,
      ...(Array.isArray(item.images) ? item.images : []),
      ...(Array.isArray(item.galleryImages) ? item.galleryImages : []),
    ].filter(Boolean).forEach((value) => {
      normalizeKeys(value).forEach((key) => existingMediaMap.set(key, item.publicUrl || value));
    });
  });

  const htmlDocs = new Map();
  const allRefs = new Set();
  for (const file of HTML_FILES) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    const refs = extractRefs(html);
    htmlDocs.set(file, { html, refs });
    refs.forEach((ref) => allRefs.add(ref));
  }

  const refs = uniqueByKey([...allRefs].filter(Boolean), stripQuery);
  const mapping = new Map();
  const mediaRecords = {};
  const failures = [];
  const foldersUsed = new Set();
  let resolvedCount = 0;
  let cachedCount = 0;

  for (const refValue of refs) {
    const lookupKeys = normalizeKeys(refValue);
    const cached = lookupKeys.map((key) => existingMediaMap.get(key)).find(Boolean);
    if (cached) {
      mapping.set(stripQuery(refValue), cached);
      normalizeKeys(refValue).forEach((key) => mapping.set(key, cached));
      resolvedCount += 1;
      cachedCount += 1;
      continue;
    }
    const folder = guessFolder(refValue);
    foldersUsed.add(folder);
    const source = await readSourceAsset(refValue).catch((error) => ({ error }));
    if (source.error) {
      failures.push({ ref: refValue, error: source.error.message || String(source.error) });
      continue;
    }
    try {
      const uploaded = await uploadToSupabase({
        supabaseUrl,
        anonKey: supabaseKey,
        bucket,
        folder,
        name: source.name,
        buffer: source.buffer,
        mime: source.mime,
      });
      mapping.set(stripQuery(refValue), uploaded.publicUrl);
      normalizeKeys(refValue).forEach((key) => mapping.set(key, uploaded.publicUrl));
      const record = buildMediaRecord(refValue, uploaded);
      mediaRecords[record.id] = record;
      resolvedCount += 1;
    } catch (error) {
      failures.push({ ref: refValue, error: error?.message || String(error) });
    }
  }

  if (Object.keys(mediaRecords).length) {
    await patchNode(firebaseDbUrl, 'media', token, mediaRecords);
  }

  const nodesToUpdate = ['products', 'categories', 'hero', 'banner', 'testimonials', 'settings', 'payment'];
  for (const node of nodesToUpdate) {
    const data = await fetchNode(firebaseDbUrl, node, token).catch(() => null);
    if (!data) continue;
    const transformed = transformCollection(data, mapping);
    if (JSON.stringify(transformed) === JSON.stringify(data)) continue;
    await putNode(firebaseDbUrl, node, token, transformed);
  }

  for (const [file, { html }] of htmlDocs.entries()) {
    const updated = replaceInHtml(html, mapping);
    if (updated !== html) {
      await writeFile(path.join(ROOT, file), updated, 'utf8');
    }
  }

  const report = {
    migrated: resolvedCount,
    cached: cachedCount,
    uploaded: Object.keys(mediaRecords).length,
    foldersUsed: [...foldersUsed].sort(),
    failures,
    filesModified: HTML_FILES.filter((file) => {
      const doc = htmlDocs.get(file);
      return doc && replaceInHtml(doc.html, mapping) !== doc.html;
    }).concat(Object.keys(mediaRecords).length ? ['firebase rtdb media'] : []),
    generatedAt: new Date().toISOString(),
  };

  const reportPath = path.join(ROOT, 'migration-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const markdown = [
    '# Image Migration Report',
    '',
    `- Total migrated: ${report.migrated}`,
    `- Uploaded to Supabase: ${report.uploaded}`,
    `- Folders used: ${report.foldersUsed.join(', ') || '-'}`,
    `- Failures: ${report.failures.length}`,
    '',
    '## Files Modified',
    ...report.filesModified.map((item) => `- ${item}`),
    '',
    '## Failures',
    ...(report.failures.length ? report.failures.map((item) => `- ${item.ref}: ${item.error}`) : ['- None']),
    '',
  ].join('\n');
  await writeFile(path.join(ROOT, 'migration-report.md'), markdown, 'utf8');

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
