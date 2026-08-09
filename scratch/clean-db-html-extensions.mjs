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

function cleanString(val) {
  if (typeof val !== 'string') return val;
  // If it's something like "index.html#services", turn to "/#services" or "#services"
  // Let's use "/#services" so it works from other pages too
  let nextVal = val;
  if (nextVal.includes('index.html')) {
    nextVal = nextVal.replace(/index\.html/g, '');
  }
  if (nextVal.includes('payment.html')) {
    nextVal = nextVal.replace(/payment\.html/g, 'payment');
  }
  if (nextVal !== val) {
    console.log(`  Cleaning URL: "${val}" -> "${nextVal}"`);
  }
  return nextVal;
}

function cleanObjectRecursively(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return cleanString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectRecursively);
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = cleanObjectRecursively(val);
    }
    return result;
  }
  return obj;
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

  const nodes = ['hero', 'banner', 'categories', 'products', 'faq', 'testimonials'];
  
  for (const node of nodes) {
    console.log(`Processing node: ${node}...`);
    const dbRes = await fetch(`${firebaseDbUrl}/${node}.json?auth=${auth}`);
    const data = await dbRes.json();
    if (!data) {
      console.log(`Node ${node} is empty.`);
      continue;
    }
    
    const cleaned = cleanObjectRecursively(data);
    
    // Save back to DB
    const saveRes = await fetch(`${firebaseDbUrl}/${node}.json?auth=${auth}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned)
    });
    if (saveRes.ok) {
      console.log(`Successfully updated node: ${node}`);
    } else {
      console.error(`Failed to update node: ${node}`, await saveRes.text());
    }
  }
}

main().catch(console.error);
