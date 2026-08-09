import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
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

async function main() {
  const rawEnv = await readFile(ENV_PATH, 'utf8');
  const env = parseEnv(rawEnv);
  
  const firebaseApiKey = env.FIREBASE_API_KEY || env.apiKey || 'AIzaSyCD_cZXyfYd01FNg-DmRpyKKBIGR3NqeT4';
  const firebaseDbUrl = env.FIREBASE_DATABASE_URL || env.databaseURL || 'https://linkadda-cd1da-default-rtdb.firebaseio.com';
  const firebaseEmail = env.admin || env.ADMIN_EMAIL;
  const firebasePassword = env.password || env.ADMIN_PASSWORD;

  // Login
  const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: firebaseEmail, password: firebasePassword, returnSecureToken: true }),
  });
  const loginData = await loginRes.json();
  if (!loginData.idToken) throw new Error('Firebase login failed');

  const auth = loginData.idToken;

  console.log('Updating corrupted category badge fields in Firebase...');

  // Update Category pack-19 badge
  const c19Res = await fetch(`${firebaseDbUrl}/categories/pack-19.json?auth=${auth}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badge: 'LESBIAN' }),
  });
  console.log('Category pack-19 badge update status:', c19Res.status);

  // Update Category pack-20 badge
  const c20Res = await fetch(`${firebaseDbUrl}/categories/pack-20.json?auth=${auth}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badge: 'MIX' }),
  });
  console.log('Category pack-20 badge update status:', c20Res.status);

  console.log('Successfully completed Category badge repair!');
}

main().catch(console.error);
