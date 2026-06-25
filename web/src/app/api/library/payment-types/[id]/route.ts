import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const paymentTypeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = paymentTypeUpdateSchema.parse(body);

    await prisma.payment_types.update({
      where: { id },
      data: parsedBody as any,
    });

    return NextResponse.json({ message: 'Payment type updated successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Payment type not found' }, { status: 404 });
    }
    console.error(`PUT /api/library/payment-types/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.payment_types.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Payment type deleted successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Payment type not found' }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete payment type because it is referenced in transactions' }, { status: 400 });
    }
    console.error(`DELETE /api/library/payment-types/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
