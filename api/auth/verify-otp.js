import crypto from 'node:crypto';
import { getAuthSecret, isValidEmail, handleCors, deriveCustomerId, formatFallbackName } from '../_utils.js';

const failedAttemptsMap = globalThis.__LINKADDA_OTP_ATTEMPTS || (globalThis.__LINKADDA_OTP_ATTEMPTS = new Map());
const MAX_VERIFY_ATTEMPTS = 5;

export default async function handler(req, res) {
  // CORS configuration
  if (handleCors(req, res, 'POST, OPTIONS')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    const token = String(body.token || '').trim();
    const displayName = String(body.name || '').trim();

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address provided.' });
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    if (!token || !token.includes('.')) {
      return res.status(400).json({ error: 'Invalid or missing security token. Please request a new OTP.' });
    }

    const [expiresStr, signature] = token.split('.');
    const expires = Number(expiresStr);

    if (isNaN(expires) || !signature) {
      return res.status(400).json({ error: 'Malformed security token. Please request a new OTP.' });
    }

    // Check expiration (5 minutes)
    if (Date.now() > expires) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const attemptKey = `${email}:${expiresStr}`;
    const currentAttempts = failedAttemptsMap.get(attemptKey) || 0;
    if (currentAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. This verification code has been invalidated. Please request a new one.' });
    }

    // Verify HMAC signature
    const secret = getAuthSecret();
    const hashData = `${email}:${otp}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(hashData).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      const nextAttempts = currentAttempts + 1;
      failedAttemptsMap.set(attemptKey, nextAttempts);
      const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - nextAttempts);
      if (remaining === 0) {
        return res.status(429).json({ error: 'Too many incorrect attempts. This code is now locked. Please request a new code.' });
      }
      return res.status(400).json({ error: `Incorrect verification code. ${remaining} attempt(s) remaining.` });
    }

    // Clear failed attempts counter on success
    failedAttemptsMap.delete(attemptKey);

    // Deterministic UID based on customer email
    const uid = deriveCustomerId(email);
    const fallbackName = formatFallbackName(email);

    // Reconcile and unify with existing database record
    let existing = null;
    try {
      const { fetchCustomerRecord, saveCustomerRecord } = await import('./customer.js');
      existing = await fetchCustomerRecord(uid, null);

      const finalDisplayName = displayName || existing?.displayName || fallbackName;
      const existingProviders = Array.isArray(existing?.providers)
        ? existing.providers
        : (existing?.provider ? [existing.provider] : []);
      const mergedProviders = Array.from(new Set([...existingProviders, 'email_otp'].filter(Boolean)));

      const customerUser = {
        uid,
        email,
        displayName: finalDisplayName,
        provider: 'email_otp',
        providers: mergedProviders,
        verified: true,
        createdAt: existing?.createdAt || Date.now(),
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveCustomerRecord(uid, customerUser, null);

      return res.status(200).json({
        success: true,
        user: customerUser,
        isNew: !existing,
        message: 'Email verification successful.',
      });
    } catch (saveErr) {
      console.warn('Customer verification database sync notice:', saveErr.message);
    }

    const fallbackCustomerUser = {
      uid,
      email,
      displayName: displayName || existing?.displayName || fallbackName,
      provider: 'email_otp',
      providers: Array.from(new Set([...(existing?.providers || []), 'email_otp'])),
      verified: true,
      createdAt: existing?.createdAt || Date.now(),
      lastLoginAt: Date.now(),
    };

    return res.status(200).json({
      success: true,
      user: fallbackCustomerUser,
      message: 'Email verification successful.',
    });
  } catch (err) {
    console.error('Unexpected error in /api/auth/verify-otp:', err);
    return res.status(500).json({
      error: err?.message || 'Internal server error verifying OTP.',
    });
  }
}
