import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'agentpd-secret-key-2026-fallback';
const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createToken(userId: string, tokenType: 'access' | 'refresh'): Promise<string> {
  const now = Date.now();
  const expiry = tokenType === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;

  const payload: TokenPayload = {
    sub: userId,
    type: tokenType,
    iat: now,
    exp: now + expiry,
  };

  const header = { alg: JWT_ALGORITHM, typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = await hmacSign(signatureInput, JWT_SECRET);
  const signatureEncoded = base64UrlEncode(signature);

  return `${signatureInput}.${signatureEncoded}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = await hmacSign(signatureInput, JWT_SECRET);
    const expectedSignatureEncoded = base64UrlEncode(expectedSignature);

    if (signatureEncoded !== expectedSignatureEncoded) return null;

    const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadEncoded));

    if (Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

export { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };
