import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const paymentTypeSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  is_active: z.boolean().default(true).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const data = await prisma.payment_types.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/library/payment-types error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const parsedBody = paymentTypeSchema.parse(body);

    const newPaymentType = await prisma.payment_types.create({
      data: parsedBody as any,
    });

    return NextResponse.json({
      message: 'Payment type created successfully',
      id: newPaymentType.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/library/payment-types error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
