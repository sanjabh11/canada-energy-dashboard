/**
 * Netlify Function: auth-session
 * 
 * Manages Whop auth tokens in httpOnly cookies instead of localStorage.
 * Endpoints:
 *   POST /api/auth/login   — Sets httpOnly cookie with token, returns user data
 *   POST /api/auth/logout  — Clears the cookie
 *   GET  /api/auth/session  — Returns current session (reads cookie, returns token to caller)
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const COOKIE_NAME = 'whop_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
}

function buildCookie(token: string, maxAge: number): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Path=/`,
    `Max-Age=${maxAge}`,
  ];
  return parts.join('; ');
}

function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function corsHeaders(origin: string | undefined) {
  const allowed = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://canada-energy.netlify.app',
    'https://ceip.netlify.app',
  ];
  const resolvedOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const origin = event.headers['origin'];
  const cors = corsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/auth-session', '').replace('/api/auth', '');

  // POST /login — store token in httpOnly cookie
  if (event.httpMethod === 'POST' && (path === '/login' || path === '')) {
    try {
      const body = JSON.parse(event.body || '{}');
      const { token, user } = body;

      if (!token) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: 'Token is required' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...cors,
          'Set-Cookie': buildCookie(token, COOKIE_MAX_AGE),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: true, user }),
      };
    } catch (e) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }
  }

  // POST /logout — clear cookie
  if (event.httpMethod === 'POST' && path === '/logout') {
    return {
      statusCode: 200,
      headers: {
        ...cors,
        'Set-Cookie': clearCookie(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true }),
    };
  }

  // GET /session — return token from cookie (only accessible server-side or same-origin)
  if (event.httpMethod === 'GET' && (path === '/session' || path === '')) {
    const cookies = parseCookies(event.headers['cookie']);
    const token = cookies[COOKIE_NAME];

    if (!token) {
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticated: false }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: true, token }),
    };
  }

  return {
    statusCode: 404,
    headers: cors,
    body: JSON.stringify({ error: 'Not found' }),
  };
};

export { handler };
