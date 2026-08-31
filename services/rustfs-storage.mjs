import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import https from 'node:https';
import http from 'node:http';

/**
 * RustFS / S3-Compatible Storage Service for LinkAdda
 *
 * Server-side storage abstraction supporting upload, download, delete,
 * listing, and presigned/public URL generation.
 */

// Custom agent to support self-hosted/custom TLS certs securely on server side
const customHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' && process.env.RUSTFS_STRICT_SSL === 'true',
  keepAlive: true,
});

const customHttpAgent = new http.Agent({
  keepAlive: true,
});

export function getRustfsConfig(customEnv = {}) {
  const env = { ...process.env, ...customEnv };
  const endpoint = String(env.RUSTFS_ENDPOINT || 'https://s3.linkadda.shop').replace(/\/+$/, '');
  const bucket = String(env.RUSTFS_BUCKET || 'linkadda-media').trim();
  const region = String(env.RUSTFS_REGION || 'us-east-1').trim();
  const accessKeyId = String(env.RUSTFS_ACCESS_KEY || '').trim();
  const secretAccessKey = String(env.RUSTFS_SECRET_KEY || '').trim();

  return {
    endpoint,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    isConfigured: Boolean(accessKeyId && secretAccessKey),
  };
}

export function createS3Client(customConfig = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // Standard for self-hosted S3/RustFS
    requestHandler: {
      httpsAgent: customHttpsAgent,
      httpAgent: customHttpAgent,
    },
  });
}

/**
 * Normalize storage path key (strips leading slashes and query params)
 */
export function normalizeKey(key) {
  return String(key || '')
    .trim()
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+/, '');
}

/**
 * Detect standard MIME type based on file extension
 */
export function detectMimeType(fileNameOrKey) {
  const clean = normalizeKey(fileNameOrKey).toLowerCase();
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.avif')) return 'image/avif';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mov') || clean.endsWith('.quicktime')) return 'video/quicktime';
  if (clean.endsWith('.m4v')) return 'video/x-m4v';
  if (clean.endsWith('.ogg') || clean.endsWith('.ogv')) return 'video/ogg';
  return 'application/octet-stream';
}

/**
 * Generate public URL for an asset in RustFS
 */
export function getPublicUrl(key, customConfig = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const cleanKey = normalizeKey(key);
  return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeURI(cleanKey)}`;
}

/**
 * Upload an object to RustFS S3
 */
export async function uploadObject({
  key,
  body,
  contentType,
  metadata = {},
  client = null,
  customConfig = {},
}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const s3 = client || createS3Client(config);
  const cleanKey = normalizeKey(key);
  const mime = contentType || detectMimeType(cleanKey);

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: cleanKey,
    Body: body,
    ContentType: mime,
    Metadata: metadata,
  });

  const response = await s3.send(command);

  return {
    key: cleanKey,
    bucket: config.bucket,
    publicUrl: getPublicUrl(cleanKey, config),
    contentType: mime,
    eTag: response.ETag,
    versionId: response.VersionId,
  };
}

/**
 * Check if an object exists in RustFS S3
 */
export async function checkObject(key, client = null, customConfig = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const s3 = client || createS3Client(config);
  const cleanKey = normalizeKey(key);

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: cleanKey,
    });
    const res = await s3.send(command);
    return {
      exists: true,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
      lastModified: res.LastModified,
      eTag: res.ETag,
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

/**
 * Get / read an object from RustFS S3
 */
export async function getObject(key, client = null, customConfig = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const s3 = client || createS3Client(config);
  const cleanKey = normalizeKey(key);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: cleanKey,
  });

  const response = await s3.send(command);
  const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  };

  const buffer = response.Body ? await streamToBuffer(response.Body) : Buffer.alloc(0);

  return {
    key: cleanKey,
    buffer,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    eTag: response.ETag,
    metadata: response.Metadata,
  };
}

/**
 * Delete an object from RustFS S3
 */
export async function deleteObject(key, client = null, customConfig = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const s3 = client || createS3Client(config);
  const cleanKey = normalizeKey(key);

  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: cleanKey,
  });

  return s3.send(command);
}

/**
 * List objects in RustFS S3 bucket
 */
export async function listObjects({
  prefix = '',
  maxKeys = 1000,
  continuationToken = undefined,
  client = null,
  customConfig = {},
} = {}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const s3 = client || createS3Client(config);

  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  });

  const response = await s3.send(command);

  return {
    objects: (response.Contents || []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      eTag: item.ETag,
      publicUrl: getPublicUrl(item.Key, config),
    })),
    isTruncated: response.IsTruncated,
    nextContinuationToken: response.NextContinuationToken,
    keyCount: response.KeyCount,
  };
}

// AWS SigV4 Presigner Implementation
function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest(encoding);
}

function sha256(string) {
  return crypto.createHash('sha256').update(string, typeof string === 'string' ? 'utf8' : undefined).digest('hex');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

/**
 * Generate a presigned URL using standard AWS SigV4 query string auth
 */
export async function generatePresignedUrl({
  key,
  operation = 'PUT', // 'PUT' | 'GET'
  expiresIn = 3600, // 1 hour default
  contentType = undefined,
  customConfig = {},
}) {
  const config = { ...getRustfsConfig(), ...customConfig };
  const cleanKey = normalizeKey(key);
  const method = String(operation).toUpperCase();
  const mime = contentType || detectMimeType(cleanKey);

  const urlObj = new URL(config.endpoint);
  const host = urlObj.host;
  const pathname = `/${config.bucket}/${cleanKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };

  const sortedQueryKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedQueryKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method,
    encodeURI(pathname),
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = hmac(signingKey, stringToSign, 'hex');

  const presignedUrl = `${config.endpoint}${pathname}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return {
    presignedUrl,
    key: cleanKey,
    publicUrl: getPublicUrl(cleanKey, config),
    expiresIn,
    contentType: mime,
  };
}
