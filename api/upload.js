import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import https from 'node:https';

const customHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

function getEnvConfig() {
  const endpoint = String(process.env.RUSTFS_ENDPOINT || 'https://rustfs-mi5c.srv1942099.hstgr.cloud').replace(/\/+$/, '');
  const bucket = String(process.env.RUSTFS_BUCKET || 'linkadda-media').trim();
  const region = String(process.env.RUSTFS_REGION || 'us-east-1').trim();
  const accessKeyId = String(process.env.RUSTFS_ACCESS_KEY || 'nEY6aqQXNtIKoOL2xm8b').trim();
  const secretAccessKey = String(process.env.RUSTFS_SECRET_KEY || 'KxnOyOR6scFpsBZmrKsyUE9oUt1aZfpWSWw5NJFX').trim();

  return { endpoint, bucket, region, accessKeyId, secretAccessKey };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-folder, x-filename');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const config = getEnvConfig();
    const s3 = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      requestHandler: {
        httpsAgent: customHttpsAgent,
      },
    });

    let bodyBuffer;
    let contentType = 'image/png';
    let folder = 'products';
    let filename = `asset_${Date.now()}.png`;

    if (typeof req.body === 'object' && req.body !== null) {
      folder = String(req.body.folder || 'products').replace(/^\/+|\/+$/g, '');
      filename = String(req.body.filename || `${Date.now()}_asset.png`).replace(/[^a-zA-Z0-9_.-]/g, '_');
      contentType = String(req.body.contentType || 'image/png');

      if (req.body.base64) {
        let rawBase64 = req.body.base64;
        if (rawBase64.includes('base64,')) {
          const parts = rawBase64.split('base64,');
          rawBase64 = parts[1];
          const matchMime = parts[0].match(/data:([^;]+);/);
          if (matchMime) contentType = matchMime[1];
        }
        bodyBuffer = Buffer.from(rawBase64, 'base64');
      } else if (req.body.buffer) {
        bodyBuffer = Buffer.from(req.body.buffer);
      }
    }

    if (!bodyBuffer || bodyBuffer.length === 0) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
    });

    await s3.send(command);

    const publicUrl = `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeURI(key)}`;

    return res.status(200).json({
      success: true,
      key,
      bucket: config.bucket,
      publicUrl,
      size: bodyBuffer.length,
      contentType,
    });
  } catch (err) {
    console.error('S3 upload error in /api/upload:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to upload asset to storage.',
    });
  }
}
