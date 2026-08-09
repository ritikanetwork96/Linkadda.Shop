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

  // Fetch products
  const productsRes = await fetch(`${firebaseDbUrl}/products.json?auth=${loginData.idToken}`);
  const products = await productsRes.json();

  // Fetch categories
  const categoriesRes = await fetch(`${firebaseDbUrl}/categories.json?auth=${loginData.idToken}`);
  const categories = await categoriesRes.json();

  console.log('--- PRODUCTS IN FIREBASE ---');
  if (products) {
    for (const [id, prod] of Object.entries(products)) {
      console.log(`ID: ${id} | Title: ${prod.title} | Slug: ${prod.slug}`);
    }
  }

  console.log('\n--- CATEGORIES IN FIREBASE ---');
  if (categories) {
    for (const [id, cat] of Object.entries(categories)) {
      console.log(`ID: ${id} | Title: ${cat.title} | Slug: ${cat.slug}`);
    }
  }
}

main().catch(console.error);
