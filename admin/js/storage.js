import { RUSTFS_CONFIG, SUPABASE_CONFIG } from './config.js';
import { uid } from './utils.js';

const SUPABASE_STORAGE_ROOT = `${SUPABASE_CONFIG.url}/storage/v1/object`;
const RUSTFS_STORAGE_ROOT = `${RUSTFS_CONFIG.endpoint}/${encodeURIComponent(RUSTFS_CONFIG.bucket)}`;

function joinPath(...parts) {
  return parts
    .map((part) => String(part || '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function getRustfsUrl(path) {
  const clean = String(path || '').replace(/^\/+/, '');
  return `${RUSTFS_STORAGE_ROOT}/${encodeURI(clean)}`;
}

export function getSupabaseUrl(path) {
  const clean = String(path || '').replace(/^\/+/, '');
  return `${SUPABASE_STORAGE_ROOT}/public/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(clean)}`;
}

export function getPublicUrl(path) {
  const clean = String(path || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  // Default to new RustFS S3 storage
  return getRustfsUrl(clean);
}

function makeSupabaseHeaders(contentType) {
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
  const type = String(file.type || '').toLowerCase();
  const isImage = type.startsWith('image/');
  const isVideo = type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Only image and video uploads are allowed.');
  }

  if (isImage) {
    const allowedImages = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedImages.includes(type)) {
      throw new Error('Unsupported image format.');
    }
    const maxImageBytes = 10 * 1024 * 1024; // 10 MB
    if (Number(file.size || 0) > maxImageBytes) {
      throw new Error('Image is too large. Max size is 10 MB.');
    }
  }

  if (isVideo) {
    const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'];
    if (!allowedVideos.includes(type)) {
      throw new Error('Unsupported video format.');
    }
    const maxVideoBytes = 100 * 1024 * 1024; // 100 MB
    if (Number(file.size || 0) > maxVideoBytes) {
      throw new Error('Video is too large. Max size is 100 MB.');
    }
  }
}

export function getStoragePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    
    // Check RustFS pattern: /linkadda-media/path
    const rustfsMarker = `/${encodeURIComponent(RUSTFS_CONFIG.bucket)}/`;
    const rustfsIdx = url.pathname.indexOf(rustfsMarker);
    if (rustfsIdx >= 0) {
      return decodeURIComponent(url.pathname.slice(rustfsIdx + rustfsMarker.length));
    }

    // Check Supabase pattern: /storage/v1/object/public/media/path
    const supaMarker = `/storage/v1/object/public/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/`;
    const supaIdx = url.pathname.indexOf(supaMarker);
    if (supaIdx >= 0) {
      return decodeURIComponent(url.pathname.slice(supaIdx + supaMarker.length));
    }
  } catch (_) {
    // Not a URL, fall back to the raw value.
  }
  return raw.split('?')[0].split('#')[0].replace(/^\/+/, '');
}

export async function deletePublicAsset(path) {
  const storagePath = getStoragePath(path);
  if (!storagePath) return;

  const isSupabase = String(path || '').includes('supabase.co');

  if (isSupabase) {
    try {
      const res = await fetch(`${SUPABASE_STORAGE_ROOT}/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(storagePath)}`, {
        method: 'DELETE',
        headers: makeSupabaseHeaders(),
      });
      return res;
    } catch (e) {
      console.warn('Supabase delete error (skipped):', e);
    }
  }

  // Deletion from RustFS via server API if available
  return true;
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

    // Upload with fallback support
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_STORAGE_ROOT}/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodeURI(path)}`, true);
    xhr.setRequestHeader('apikey', SUPABASE_CONFIG.anonKey);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_CONFIG.anonKey}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    function fallbackAsDataUrl() {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          path,
          publicUrl: reader.result,
          rustfsUrl: getRustfsUrl(path),
          legacySupabaseUrl: reader.result,
          isDataUrl: true,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          path,
          publicUrl: getPublicUrl(path),
          rustfsUrl: getRustfsUrl(path),
          legacySupabaseUrl: getSupabaseUrl(path),
        });
      } else {
        console.warn('Remote upload failed, using high-res local data URL fallback:', xhr.status);
        fallbackAsDataUrl();
      }
    };
    xhr.onerror = () => {
      console.warn('Network upload failed, falling back to local data URL.');
      fallbackAsDataUrl();
    };
    xhr.send(file);
  });
}
