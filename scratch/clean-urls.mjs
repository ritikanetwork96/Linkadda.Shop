import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env');
const BASE_MARKER = 'https://noecylfqhtfwbjfkjxoo.supabase.co/storage/v1/object/public/media/';

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

function cleanUrlString(val) {
  if (typeof val !== 'string') return val;
  if (!val.includes(BASE_MARKER)) return val;
  const parts = val.split(BASE_MARKER);
  const lastPart = parts[parts.length - 1];
  return BASE_MARKER + lastPart.replace(/^\/+/, '');
}

function cleanHtml(html) {
  const regex = /https:\/\/noecylfqhtfwbjfkjxoo\.supabase\.co\/storage\/v1\/object\/public\/media\/[^\s"'<>]+/g;
  return html.replace(regex, (match) => {
    return cleanUrlString(match);
  });
}

function cleanObjectRecursively(obj) {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return cleanUrlString(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectRecursively);
  }
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = cleanObjectRecursively(val);
  }
  return result;
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

function rtdbUrl(baseUrl, node, token) {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${node}.json`);
  if (token) url.searchParams.set('auth', token);
  return url.toString();
}

async function fetchNode(baseUrl, node, token) {
  return httpJson(rtdbUrl(baseUrl, node, token), { method: 'GET', headers: { Accept: 'application/json' } });
}

async function putNode(baseUrl, node, token, payload) {
  return httpJson(rtdbUrl(baseUrl, node, token), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function main() {
  console.log('--- HTML Cleanup ---');
  for (const file of ['index.html', 'payment.html']) {
    try {
      const htmlPath = path.join(ROOT, file);
      const html = await readFile(htmlPath, 'utf8');
      const nextHtml = cleanHtml(html);
      if (html !== nextHtml) {
        await writeFile(htmlPath, nextHtml, 'utf8');
        console.log(`Cleaned up URLs in: ${file}`);
      } else {
        console.log(`No corrupted URLs found in: ${file}`);
      }
    } catch (e) {
      console.error(`Failed to process ${file}:`, e.message);
    }
  }

  console.log('\n--- Database Cleanup ---');
  const env = await loadEnv();
  const firebaseApiKey = env.FIREBASE_API_KEY || env.apiKey || 'AIzaSyCD_cZXyfYd01FNg-DmRpyKKBIGR3NqeT4';
  const firebaseDbUrl = env.FIREBASE_DATABASE_URL || env.databaseURL || 'https://linkadda-cd1da-default-rtdb.firebaseio.com';
  const firebaseEmail = env.admin || env.ADMIN_EMAIL;
  const firebasePassword = env.password || env.ADMIN_PASSWORD;

  if (!firebaseEmail || !firebasePassword) {
    console.warn('Skipping database cleanup: Missing admin credentials in .env');
    return;
  }

  try {
    const token = await firebaseLogin({ apiKey: firebaseApiKey, email: firebaseEmail, password: firebasePassword });
    const nodes = ['categories', 'products', 'media', 'hero', 'banner', 'settings', 'payment'];
    
    for (const node of nodes) {
      const data = await fetchNode(firebaseDbUrl, node, token);
      if (!data) {
        console.log(`Node "${node}" is empty, skipping.`);
        continue;
      }
      const cleanedData = cleanObjectRecursively(data);
      await putNode(firebaseDbUrl, node, token, cleanedData);
      console.log(`Successfully cleaned and saved node: "${node}"`);
    }
  } catch (error) {
    console.error('Database cleanup failed:', error.message);
  }
}

main().catch(console.error);
