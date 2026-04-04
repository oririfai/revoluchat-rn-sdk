/**
 * JWT Utilities for Revoluchat RN SDK.
 * Provides token decoding, expiry detection, and scheduling support.
 * No external dependencies — uses pure base64 decoding.
 */

interface JWTPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  app_id?: string;
  [key: string]: any;
}

/**
 * Decodes a JWT token and returns its payload.
 * Does NOT verify the signature (verification happens server-side).
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64 URL decode the payload (second part)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is expired (or within the given buffer window).
 * @param token JWT string
 * @param bufferSeconds seconds before actual expiry to consider it "expired" (default: 60s)
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowSeconds <= bufferSeconds;
}

/**
 * Returns the number of milliseconds until the token expires, minus the buffer.
 * Returns 0 if already expired.
 * @param token JWT string
 * @param bufferSeconds seconds before actual expiry to trigger refresh (default: 60s)
 */
export function msUntilTokenExpiry(token: string, bufferSeconds = 60): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return 0;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - nowSeconds - bufferSeconds;
  return Math.max(0, remainingSeconds * 1000);
}
