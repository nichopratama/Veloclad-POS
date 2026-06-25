import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Endpoint Better Auth (login, logout, session, dll) — Nicho-Brain D7.
export const { GET, POST } = toNextJsHandler(auth);

