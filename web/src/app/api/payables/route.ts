import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    // Default to sorting by due_date asc (urging payments)
    const payables = await prisma.payables.findMany({
      include: {
        suppliers: { select: { name: true, phone: true } },
        purchase_orders: { select: { po_number: true, payment_method: true } },
      },
      orderBy: [
        { status: 'asc' }, // OPEN first
        { due_date: 'asc' }, // Earliest due date first
      ],
    });

    return NextResponse.json({ data: payables });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/payables error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
