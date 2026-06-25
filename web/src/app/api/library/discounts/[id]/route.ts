import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const discountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  max_value: z.number().nonnegative().nullish(),
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
    const parsedBody = discountUpdateSchema.parse(body);

    await prisma.discounts.update({
      where: { id },
      data: parsedBody as any,
    });

    return NextResponse.json({ message: 'Discount updated successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }
    console.error(`PUT /api/library/discounts/[id] error:`, error);
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

    await prisma.discounts.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Discount deleted successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }
    console.error(`DELETE /api/library/discounts/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
