import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/lib/rbac';
import { ApiError } from '@/lib/errors';

// Re-export agar `import { ApiError } from '@/lib/api'` yang sudah tersebar
// di route tetap berfungsi tanpa perubahan. Definisi pindah ke lib/errors.ts
// (bebas Next) supaya modul logika uang bisa di-unit-test.
export { ApiError };

/**
 * Handler error terpusat (Nicho-Brain D7/D13): pesan generik untuk 5xx (no leak),
 * pesan spesifik untuk 4xx yang disengaja. Detail 5xx hanya ke log server.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof AuthError || error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    if (error.code === 'P2002') {
      // CATATAN: di Postgres, `meta.target` = nama FIELD (mis. ['code']), BUKAN nama
      // constraint ('items_code_unique'). Jangan cek nama constraint — pakai field.
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : null;
      return NextResponse.json(
        { error: fields ? `Nilai duplikat untuk: ${fields}` : 'Conflict: duplicate entry' },
        { status: 409 },
      );
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Tidak bisa dihapus/diubah: masih dipakai record lain' }, { status: 409 });
    }
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

