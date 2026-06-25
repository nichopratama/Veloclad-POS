import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/lib/rbac';

/**
 * Error bisnis dengan status HTTP (mis. stok kurang, pembayaran kurang).
 * Dipakai untuk 4xx yang disengaja — pesan boleh ditampilkan ke klien.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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
    if (error.code === 'P2002') return NextResponse.json({ error: 'Conflict: duplicate entry' }, { status: 409 });
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

