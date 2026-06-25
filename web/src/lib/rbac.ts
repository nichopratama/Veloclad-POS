import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * RBAC server-side untuk Next.js (Nicho-Brain D7) — port konsep dari
 * `api/src/middleware/rbac.js`. Dipakai di awal Route Handler.
 *
 * Mengembalikan session jika lolos; melempar Response 401/403 jika tidak.
 * Pemakaian:
 *   const session = await requireRole('owner', 'admin');
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
  if (!allowedRoles.includes(role)) {
    throw new AuthError(403, 'Forbidden: role tidak diizinkan untuk aksi ini');
  }
  return session;
}

