import { NextResponse } from 'next/server';

// Liveness (Nicho-Brain D13)
export function GET() {
  return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
}

