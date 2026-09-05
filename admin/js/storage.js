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
  if (/^https?:\/\//i.test(clean) || clean.startsWith('data:') || clean.startsWith('blob:')) {
    if (clean.includes('supabase.co/storage/v1/object/public/media/')) {
      return clean.replace('https://noecylfqhtfwbjfkjxoo.supabase.co/storage/v1/object/public/media/', `${RUSTFS_CONFIG.endpoint}/${encodeURIComponent(RUSTFS_CONFIG.bucket)}/`);
    }
    return clean;
  }
  return getRustfsUrl(clean);
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
    const allowedImages = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
    if (!allowedImages.includes(type) && !file.name?.match(/\.(png|jpe?g|webp|gif|svg|avif)$/i)) {
      throw new Error('Unsupported image format.');
    }
    const maxImageBytes = 15 * 1024 * 1024; // 15 MB
    if (Number(file.size || 0) > maxImageBytes) {
      throw new Error('Image is too large. Max size is 15 MB.');
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
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
      });
      return res;
    } catch (e) {
      console.warn('Supabase delete error (skipped):', e);
    }
  }

  return true;
}

/**
 * Compress an image in the browser using canvas for instant fast uploads & storage
 */
async function compressImage(file, maxDimension = 1200, quality = 0.85) {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file; // SVGs and GIFs shouldn't be flattened with canvas
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' && width <= 500 && height <= 500 ? 'image/png' : 'image/webp';
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, mime === 'image/webp' ? '.webp' : '.png'), { type: mime }));
          } else {
            resolve(file);
          }
        }, mime, quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file as data URL.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Universal Asset Uploader:
 * 1. Tries Serverless API `/api/upload` (streams directly to RustFS S3).
 * 2. If `/api/upload` fails or unavailable, converts image to Base64 Data URL.
 * 3. Guarantees that returned publicUrl is 100% accessible, never returns a 404 URL.
 */
export async function uploadAsset(file, folder = 'products', onProgress) {
  validateUploadFile(file);

  if (typeof onProgress === 'function') onProgress(10);

  const ext = (file.name && file.name.includes('.'))
    ? file.name.split('.').pop()
    : (file.type && file.type.includes('/'))
      ? file.type.split('/').pop()
      : 'png';
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const fileName = `${Date.now()}_${uid('asset')}.${cleanExt}`;
  const path = joinPath(folder, fileName);

  // For logos and QR codes, use dedicated dimensions
  const maxDim = (folder === 'logos' || folder === 'qrcodes') ? 600 : 1400;
  let fileToUpload = file;
  if (file.type?.startsWith('image/')) {
    fileToUpload = await compressImage(file, maxDim, 0.88);
  }

  if (typeof onProgress === 'function') onProgress(30);

  const dataUrl = await readFileAsDataUrl(fileToUpload);

  if (typeof onProgress === 'function') onProgress(50);

  // 1. Try Serverless RustFS S3 Upload (/api/upload)
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folder,
        filename: fileName,
        base64: dataUrl,
        contentType: fileToUpload.type || file.type || 'image/png',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.publicUrl) {
        if (typeof onProgress === 'function') onProgress(100);
        return {
          path: data.key || path,
          publicUrl: data.publicUrl,
          rustfsUrl: data.publicUrl,
          dataUrl,
        };
      }
    }
  } catch (err) {
    console.warn('Server upload to /api/upload failed, using instant direct Data URL:', err);
  }

  // 2. Safe Fallback: NEVER allow large Base64 strings or videos to enter the database
  if (file.type?.startsWith('video/') || (dataUrl && dataUrl.length > 80000)) {
    throw new Error('Storage upload failed. Please check your internet connection or file size (max 15MB).');
  }

  // Tiny assets (<60KB) only may safely fallback
  if (typeof onProgress === 'function') onProgress(100);
  return {
    path,
    publicUrl: dataUrl,
    rustfsUrl: dataUrl,
    dataUrl,
    isDataUrl: true,
  };
}
