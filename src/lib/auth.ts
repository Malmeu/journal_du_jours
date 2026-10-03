import type { AstroCookies } from 'astro';

// Mot de passe d'administration défini par variable d'environnement ADMIN_PASSWORD (ou fallback temporaire)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'redaction2026';
const SESSION_COOKIE_NAME = 'journal_admin_token';
const SESSION_SECRET = 'dz_journal_secret_session_key_2026';

export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === ADMIN_PASSWORD.trim();
}

export function isAdminAuthenticated(cookies: AstroCookies): boolean {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export function setAdminSession(cookies: AstroCookies): void {
  cookies.set(SESSION_COOKIE_NAME, SESSION_SECRET, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 7 jours
  });
}

export function clearAdminSession(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/'
  });
}
