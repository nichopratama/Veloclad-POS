import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/roles';

/**
 * RBAC server-side untuk Next.js (Nicho-Brain D7) — port konsep dari
 * `api/src/middleware/rbac.js`. Dipakai di awal Route Handler.
 *
 * Mengembalikan session jika lolos; melempar Response 401/403 jika tidak.
 * Pemakaian:
 *   const session = await requireRole('admin');
 */
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new AuthError(401, 'Unauthorized');
  return session;
}

export async function requireRole(...allowedRoles: string[]) {
  const session = await requireAuth();
  const role = session.user.role ?? 'kasir';
  // 'admin' selalu lolos (akses penuh); plus tetap hormati daftar yang diminta.
  if (!allowedRoles.includes(role) && !isAdmin(role)) {
    throw new AuthError(403, 'Forbidden: role tidak diizinkan untuk aksi ini');
  }
  return session;
}

/**
 * Guard halaman admin untuk Server Component: redirect non-admin ke beranda
 * (Dashboard). Berbeda dari `requireRole` (yang melempar Response untuk API),
 * ini memakai `redirect()` Next agar cocok di render server.
 *
 * Pakai di awal page admin: `await requireAdminPage();`
 */
export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isAdmin(session.user.role)) redirect('/');
  return session;
}

