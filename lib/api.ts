const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ACCESS_TOKEN_KEY  = 'dy_access_token';
const REFRESH_TOKEN_KEY = 'dy_refresh_token';
const CSRF_COOKIE_NAME  = 'dy_csrf';

// BUG-063 — wipe every per-user localStorage key on session-end paths so the
// next user on the same device doesn't inherit stale state (Seller Mode
// label, saved email, etc.). Keep in sync with AuthContext.clearUserStorage().
function clearUserStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('dropyard:mode');
  localStorage.removeItem('dropyard_email');
}

// Auth-attempt endpoints — a 401 here means "wrong credentials", NOT
// "session expired", so we must not blow away tokens or redirect.
const AUTH_ATTEMPT_PATHS = new Set([
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/google',
  '/api/auth/refresh',
]);

// Methods that mutate state and therefore need a CSRF token attached.
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Route the "session expired" redirect to the admin login when the user is
// already inside the admin area, otherwise to the public /join page.
function sessionExpiredRedirect(): string {
  if (typeof window === 'undefined') return '/join';
  return window.location.pathname.startsWith('/admin') ? '/admin/login' : '/join';
}

interface ApiOptions extends RequestInit {
  token?: string;
  _isRetry?: boolean; // internal flag — prevent infinite retry loop
}

// The backend's answer when the X-CSRF-Token header doesn't match the dy_csrf
// cookie it reads. Never shown to people: after one retry with a fresh token,
// FRIENDLY_ERROR is shown instead.
const CSRF_ERROR = 'CSRF token missing or invalid';
export const FRIENDLY_ERROR = 'Something went wrong. Please try again.';
const isCsrfRejection = async (res: Response): Promise<boolean> => {
  if (res.status !== 403) return false;
  const body = await res.clone().json().catch(() => null) as { error?: unknown } | null;
  return body?.error === CSRF_ERROR;
};

// ─── CSRF token cache ───────────────────────────────────────────────────────
// The backend's dy_csrf cookie is readable (not httpOnly) so we mirror it
// into the X-CSRF-Token header on every mutating request. We read directly
// from document.cookie (no network call needed) — the cookie is set on
// signin/signup/refresh and persists for the refresh-token lifetime.
//
// If the cookie is missing (fresh browser, anonymous visitor), we bootstrap
// via GET /api/auth/csrf which sets it. Result is memoized for the page life.
//
// The cookie is used only when the browser holds exactly one dy_csrf. With
// none, or with two (an old host-only copy beside the domain-wide one, left
// from before COOKIE_DOMAIN was set), the token comes from GET /api/auth/csrf:
// the server returns the value it will compare the header with, and with two
// it issues a new one and expires the old copy, so the two can't disagree.
let csrfBootstrap: Promise<string | null> | null = null;
async function getCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const fromCookie = readCookies(CSRF_COOKIE_NAME);
  if (fromCookie.length === 1) return fromCookie[0];
  return fetchCsrfToken();
}
/** Ask the API for the CSRF token it checks. `fresh`: issue a new one (the
 *  single retry after a rejection). Concurrent plain calls share one request. */
export function fetchCsrfToken(fresh = false): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (csrfBootstrap && !fresh) return csrfBootstrap;
  const req: Promise<string | null> = fetch(`${BASE_URL}/api/auth/csrf${fresh ? '?fresh=1' : ''}`, { credentials: 'include', cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.csrfToken === 'string' ? j.csrfToken : null))
    .catch(() => null)
    .finally(() => { if (csrfBootstrap === req) csrfBootstrap = null; });
  csrfBootstrap = req;
  return req;
}
/** Every value of a cookie the page can see, oldest first (the browser's order). */
function readCookies(name: string): string[] {
  if (typeof document === 'undefined') return [];
  const out: string[] = [];
  for (const part of document.cookie.split('; ')) {
    if (!part.startsWith(name + '=')) continue;
    const raw = part.slice(name.length + 1);
    try { out.push(decodeURIComponent(raw)); } catch { out.push(raw); }
  }
  return out;
}

/**
 * POST (or PUT/PATCH/DELETE) from a public form: the waitlist, early access,
 * contact, unsubscribe and the like. Works signed in or out:
 *   - cookies travel (credentials: 'include'), so a signed-in browser's
 *     session cookie does too, and the backend's CSRF check applies;
 *   - the X-CSRF-Token header is always sent, fetching a token first if the
 *     page has none (or two);
 *   - if the API still answers "CSRF token missing or invalid" (a token
 *     rotated by another tab, an old duplicate cookie...), a fresh token is
 *     fetched and the request retried once;
 *   - if that fails too, `data.error` is FRIENDLY_ERROR, never the technical text.
 * Never redirects and never signs anyone out: a public form just reports.
 * `bearer` adds an Authorization header (submissions link a signed-in user).
 * A network failure rejects, as fetch does.
 */
export async function publicRequest<T extends object = Record<string, unknown>>(
  path: string,
  { method = 'POST', body, bearer }: { method?: string; body?: unknown; bearer?: string | null } = {},
): Promise<{ ok: boolean; status: number; data: Partial<T> & { error?: string } }> {
  const send = (csrf: string | null) => fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let res = await send(await getCsrfToken());
  if (await isCsrfRejection(res)) res = await send(await fetchCsrfToken(true));
  const data = (await res.json().catch(() => ({}))) as Partial<T> & { error?: string };
  if (!res.ok && data.error === CSRF_ERROR) data.error = FRIENDLY_ERROR;
  return { ok: res.ok, status: res.status, data };
}

async function doFetch(path: string, options: ApiOptions): Promise<Response> {
  const { token, _isRetry: _, headers, method, ...rest } = options;
  const effectiveMethod = (method || 'GET').toUpperCase();

  // Attach CSRF header on mutating browser requests. Bypassed when an explicit
  // Bearer token is present (server-to-server/mobile — backend's csrfProtection
  // middleware skips Bearer-authenticated calls anyway).
  let csrfHeader: Record<string, string> = {};
  if (MUTATING_METHODS.has(effectiveMethod) && !token) {
    const csrf = await getCsrfToken();
    if (csrf) csrfHeader = { 'X-CSRF-Token': csrf };
  }

  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    method: effectiveMethod,
    // BUG-058 — send cookies on every request so the httpOnly session cookie
    // travels cross-site (frontend on dropyard.app, backend on api.dropyard.app).
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...csrfHeader,
      ...headers,
    },
  });
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  // BUG-059 — auth ride-along: cookies are the canonical auth surface. We
  // intentionally do NOT auto-attach a Bearer header from localStorage. If a
  // caller explicitly hands us options.token (curl-style server callers,
  // tests), we honor it. Otherwise the httpOnly cookie does the work.
  // Dual-sending Bearer + cookie made tampering with localStorage look like
  // it worked (because cookie silently took over). Removing the auto-Bearer
  // makes the behavior obvious: the only thing that authenticates is the
  // httpOnly cookie an attacker can't touch from JS.

  let res = await doFetch(path, options);
  // One retry with a fresh CSRF token (see publicRequest).
  if (!options.token && await isCsrfRejection(res)) {
    await fetchCsrfToken(true);
    res = await doFetch(path, options);
  }

  const isAuthAttempt = AUTH_ATTEMPT_PATHS.has(path);

  // 401 handling — branch on the backend's error code (BUG-059):
  //   TOKEN_EXPIRED → silent refresh + retry (normal flow)
  //   TOKEN_INVALID / NO_TOKEN / no code → straight to /join (don't gift a
  //     fresh session to a tamper attempt)
  //   isAuthAttempt → leave it to the form handler (wrong credentials)
  if (res.status === 401 && !options._isRetry && !isAuthAttempt) {
    // Peek at the body to read the code without consuming the stream for
    // downstream callers. clone() so we can still re-read in the error path.
    const peek = await res.clone().json().catch(() => ({} as { code?: string }));
    const code = (peek as { code?: string }).code;

    if (code === 'TOKEN_EXPIRED') {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        '{}',
        });
        if (refreshRes.ok) {
          res = await doFetch(path, { ...options, _isRetry: true });
        } else {
          // Refresh itself failed (cookie missing/expired/tampered) — wipe
          // any legacy localStorage tokens and bounce to login.
          clearUserStorage();
          if (typeof window !== 'undefined') window.location.href = sessionExpiredRedirect();
          throw new Error('Session expired. Please sign in again.');
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired. Please sign in again.') throw err;
        // Network blip during refresh — fall through; the original 401
        // surfaces below as "Authentication required" to the caller.
      }
    } else {
      // TOKEN_INVALID / NO_TOKEN / unrecognized — DON'T try refresh. The
      // session is either gone or being tampered with; either way the
      // user goes back to /join. Backend already cleared the cookies.
      clearUserStorage();
      if (typeof window !== 'undefined') window.location.href = sessionExpiredRedirect();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  const data = await res.json().catch(() => ({} as Record<string, unknown>));

  if (!res.ok) {
    if (res.status === 401 && isAuthAttempt) {
      throw new Error((data as { error?: string }).error || 'Invalid email or password.');
    }
    if (res.status === 401 && typeof window !== 'undefined') {
      clearUserStorage();
      window.location.href = sessionExpiredRedirect();
      throw new Error('Session expired. Please sign in again.');
    }
    const error = (data as { error?: string }).error;
    throw new Error(error === CSRF_ERROR ? FRIENDLY_ERROR : error || 'Something went wrong');
  }

  return data as T;
}

// ─── Multipart uploads ─────────────────────────────────────────────────────
// Multipart bodies don't go through apiRequest (the browser must set the
// multipart content-type with its boundary), so they get their own auth +
// CSRF wiring here. Cookies travel via credentials:'include'. Same 401
// posture as apiRequest: refresh only on TOKEN_EXPIRED, otherwise sign out.
async function doMultipart(path: string, form: FormData, csrfToken: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return fetch(`${BASE_URL}${path}`, {
    method:      'POST',
    credentials: 'include',
    headers,
    body:        form,
  });
}

async function postMultipart<T>(path: string, makeForm: () => FormData, fallbackError: string): Promise<T> {
  let res = await doMultipart(path, makeForm(), await getCsrfToken());

  if (res.status === 401 && typeof window !== 'undefined') {
    const peek = await res.clone().json().catch(() => ({} as { code?: string }));
    const code = (peek as { code?: string }).code;

    if (code === 'TOKEN_EXPIRED') {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        '{}',
      });
      if (refreshRes.ok) {
        res = await doMultipart(path, makeForm(), await getCsrfToken());
      } else {
        clearUserStorage();
        window.location.href = sessionExpiredRedirect();
        throw new Error('Session expired. Please sign in again.');
      }
    } else {
      clearUserStorage();
      window.location.href = sessionExpiredRedirect();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : fallbackError);
  }
  return data as T;
}

// ─── S3 photo upload helper ─────────────────────────────────────────────────
export async function uploadItemPhoto(
  file: File
): Promise<{ key: string; publicUrl: string; maxFilesPerItem: number }> {
  return postMultipart('/api/uploads/s3', () => {
    const form = new FormData();
    form.append('file', file);
    return form;
  }, 'Upload failed');
}

// ─── Profile photo upload ───────────────────────────────────────────────────
// The blob is the cropped 512×512 re-encode from the cropper, never the
// original file, so no camera metadata leaves the device. The server checks
// the bytes and strips metadata again regardless.
export async function uploadAvatarPhoto<T = unknown>(blob: Blob): Promise<T> {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  return postMultipart<T>('/api/auth/me/avatar/photo', () => {
    const form = new FormData();
    form.append('file', blob, `profile.${ext}`);
    return form;
  }, 'Could not save your profile picture.');
}
