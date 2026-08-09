import { SUPABASE_CONFIG } from './config.js';
import { uid } from './utils.js';

const STORAGE_ROOT = `${SUPABASE_CONFIG.url}/storage/v1/object`;

function joinPath(...parts) {
  return parts
    .map((part) => String(part || '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function getBucketUrl(path) {
  return `${STORAGE_ROOT}/public/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(path)}`;
}

function makeHeaders(contentType) {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'x-upsert': 'true',
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

function validateUploadFile(file) {
  if (!file || typeof file !== 'object') {
    throw new Error('No file selected.');
  }
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(String(file.type || '').toLowerCase())) {
    throw new Error('Only image uploads are allowed.');
  }
  const maxBytes = 10 * 1024 * 1024;
  if (Number(file.size || 0) > maxBytes) {
    throw new Error('Image is too large. Max size is 10 MB.');
  }
}

export function getPublicUrl(path) {
  return getBucketUrl(path);
}

export function getStoragePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const marker = `/storage/v1/object/public/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/`;
    const index = url.pathname.indexOf(marker);
    if (index >= 0) {
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    }
  } catch (_) {
    // Not a URL, fall back to the raw value.
  }
  return raw.split('?')[0].split('#')[0].replace(/^\/+/, '');
}

export function deletePublicAsset(path) {
  const storagePath = getStoragePath(path);
  return fetch(`${STORAGE_ROOT}/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(storagePath)}`, {
    method: 'DELETE',
    headers: makeHeaders(),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Delete failed');
    }
    return response;
  });
}

export function uploadAsset(file, folder = 'products', onProgress) {
  return new Promise((resolve, reject) => {
    try {
      validateUploadFile(file);
    } catch (error) {
      reject(error);
      return;
    }
    const ext = (file.name && file.name.includes('.'))
      ? file.name.split('.').pop()
      : (file.type && file.type.includes('/'))
        ? file.type.split('/').pop()
        : 'bin';
    const fileName = `${Date.now()}_${uid('asset')}.${ext}`;
    const path = joinPath(folder, fileName);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${STORAGE_ROOT}/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(path)}`, true);
    xhr.setRequestHeader('apikey', SUPABASE_CONFIG.anonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_CONFIG.anonKey}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ path, publicUrl: getPublicUrl(path) });
      } else {
        reject(new Error(xhr.responseText || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}
