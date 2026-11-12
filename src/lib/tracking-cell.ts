import { createPrivateKey, createSign, randomUUID } from 'node:crypto';

// Client for the tracking cell (SPEC-003): bookchaowalit/productivity-tracking-api behind
// gateway.bookchaowalit.com. The web is the cell's only caller. It authenticates as identity service
// client `tracking-web` (client_credentials + private_key_jwt) and names the signed-in user in the path.
// The cell scopes every query to that user and answers 404 for another user's item.

export type CellResponse<T = unknown> = { status: number; body: T };
export type TrackingFilters = { category?: string | null; status?: string | null; isFavorite?: boolean; search?: string | null };

const DEFAULT_ISSUER = 'https://identity-api-production-fad1.up.railway.app';
const DEFAULT_API = 'https://gateway.bookchaowalit.com/v1/tracking';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_PAGES = 20;

let cached: { token: string; expiresAt: number } | null = null;

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function privateKey() {
  const pem = process.env.TRACKING_CLIENT_PRIVATE_KEY_PEM
    || (process.env.TRACKING_CLIENT_PRIVATE_KEY_PEM_B64
      ? Buffer.from(process.env.TRACKING_CLIENT_PRIVATE_KEY_PEM_B64, 'base64').toString('utf8') : '');
  if (!pem) throw new Error('tracking cell client key is not configured');
  return createPrivateKey(pem);
}

function clientAssertion(clientId: string, issuer: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: clientId, sub: clientId, aud: `${issuer}/v1/token`, iat: now, exp: now + 60, jti: randomUUID(),
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(privateKey()))}`;
}

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const issuer = process.env.TRACKING_IDENTITY_ISSUER || DEFAULT_ISSUER;
  const clientId = process.env.TRACKING_CLIENT_ID || 'tracking-web';
  const response = await fetch(`${issuer}/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'productivity-tracking-web' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion(clientId, issuer),
      audience: 'tracking-api',
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`identity token request failed with ${response.status}`);
  const data = await response.json() as { access_token: string; expires_in?: number };
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 300) * 1000 };
  return cached.token;
}

async function call<T>(method: string, path: string, body?: unknown, retry = true): Promise<CellResponse<T>> {
  const base = (process.env.TRACKING_API_URL || DEFAULT_API).replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'User-Agent': 'productivity-tracking-web',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (response.status === 401 && retry) {
    cached = null; // the token may have been rotated; fetch a fresh one once
    return call<T>(method, path, body, false);
  }
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
}

const userPath = (userId: string) => `/v1/users/${encodeURIComponent(userId)}/tracking`;

export const trackingCell = {
  // Every page of the user's list (the cell caps a page at 100 rows).
  async list(userId: string, filters: TrackingFilters): Promise<CellResponse<unknown[]>> {
    const items: unknown[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = new URLSearchParams();
      if (filters.category) query.set('category', filters.category);
      if (filters.status) query.set('status', filters.status);
      if (filters.isFavorite) query.set('isFavorite', 'true');
      if (filters.search) query.set('search', filters.search);
      if (cursor) query.set('cursor', cursor);
      const qs = query.toString();
      const response = await call<{ items: unknown[]; next_cursor: string | null }>('GET', `${userPath(userId)}${qs ? `?${qs}` : ''}`);
      if (response.status !== 200) return { status: response.status, body: [] };
      items.push(...response.body.items);
      cursor = response.body.next_cursor;
      if (!cursor) break;
    }
    return { status: 200, body: items };
  },
  add(userId: string, body: Record<string, unknown>) {
    return call<Record<string, unknown>>('POST', userPath(userId), body);
  },
  update(userId: string, itemId: string, body: Record<string, unknown>) {
    return call<Record<string, unknown>>('PUT', `${userPath(userId)}/${encodeURIComponent(itemId)}`, body);
  },
  remove(userId: string, itemId: string) {
    return call<Record<string, unknown>>('DELETE', `${userPath(userId)}/${encodeURIComponent(itemId)}`);
  },
};
