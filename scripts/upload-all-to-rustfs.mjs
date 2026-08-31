import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getRustfsConfig,
  createS3Client,
  uploadObject,
  checkObject,
  detectMimeType,
  getPublicUrl,
} from '../services/rustfs-storage.mjs';

const ROOT = process.cwd();
const IMAGES_DIR = path.join(ROOT, 'images');
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

async function firebaseLogin({ apiKey, email, password }) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data?.idToken) throw new Error('Firebase login failed');
  return data.idToken;
}

async function fetchNode(baseUrl, node, token) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/${node}.json?auth=${token}`);
  return res.json();
}

async function patchNode(baseUrl, node, token, payload) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/${node}.json?auth=${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function main() {
  console.log('======================================================');
  console.log('  Direct Batch Upload to Hostinger RustFS S3 Storage  ');
  console.log('======================================================');

  const env = parseEnv(await readFile(ENV_PATH, 'utf8'));
  const rustfsConfig = getRustfsConfig(env);

  console.log('Target RustFS Endpoint:', rustfsConfig.endpoint);
  console.log('Target Bucket:', rustfsConfig.bucket);

  const s3 = createS3Client(rustfsConfig);

  // 1. Read all local files in images/
  const files = await readdir(IMAGES_DIR);
  console.log(`Found ${files.length} local images in images/ directory.`);

  let uploadedCount = 0;
  let failedCount = 0;
  const uploadedMap = new Map();

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const buffer = await readFile(filePath);
    const mime = detectMimeType(file);

    // Determine target folder
    let folder = 'images';
    if (file.startsWith('category')) folder = 'categories';
    else if (file.startsWith('photo_')) folder = 'products';
    else if (file.includes('binance') || file.includes('paypal') || file.includes('logo')) folder = 'logos';

    const keysToUpload = [
      `${folder}/${file}`,
      `images/${file}`,
      file,
    ];

    for (const key of keysToUpload) {
      try {
        console.log(`[UPLOADING] -> ${rustfsConfig.bucket}/${key} (${buffer.length} bytes)...`);
        const res = await uploadObject({
          key,
          body: buffer,
          contentType: mime,
          client: s3,
          customConfig: rustfsConfig,
        });
        uploadedMap.set(key, res.publicUrl);
        uploadedMap.set(file, res.publicUrl);
        uploadedCount++;
      } catch (err) {
        console.error(`[ERROR] Failed to upload ${key}:`, err.message);
        failedCount++;
      }
    }
  }

  console.log(`\nLocal batch upload finished: ${uploadedCount} objects uploaded, ${failedCount} failures.`);

  // 2. Sync with Firebase RTDB
  console.log('\nAuthenticating with Firebase Realtime Database...');
  const token = await firebaseLogin({
    apiKey: env.FIREBASE_API_KEY,
    email: env.admin,
    password: env.password,
  });

  console.log('Fetching RTDB media node...');
  const mediaData = await fetchNode(env.FIREBASE_DATABASE_URL, 'media', token).catch(() => ({}));
  const updatedMedia = {};

  for (const [id, item] of Object.entries(mediaData || {})) {
    const key = item.path || item.name || '';
    const cleanPath = key.replace(/^\/+/, '');
    const fn = path.basename(cleanPath);

    let rustfsUrl = uploadedMap.get(cleanPath) || uploadedMap.get(fn) || getPublicUrl(cleanPath, rustfsConfig);

    updatedMedia[id] = {
      ...item,
      rustfsUrl,
      publicUrl: rustfsUrl,
      rustfsBucket: rustfsConfig.bucket,
      rustfsPath: cleanPath,
      updatedAt: Date.now(),
    };
  }

  if (Object.keys(updatedMedia).length > 0) {
    console.log(`Syncing ${Object.keys(updatedMedia).length} media items in Firebase RTDB...`);
    await patchNode(env.FIREBASE_DATABASE_URL, 'media', token, updatedMedia);
    console.log('Firebase RTDB updated successfully!');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL MEDIA SUCCESSFULLY MIGRATED TO HOSTINGER RUSTFS!');
  console.log('======================================================\n');
}

main().catch(console.error);
