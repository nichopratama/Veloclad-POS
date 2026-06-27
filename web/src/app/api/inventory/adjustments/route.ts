import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const adjustmentSchema = z.object({
  item_id: z.number().int(),
  qty_change: z.number().int().refine((val) => val !== 0, {
    message: "qty_change must not be 0",
  }),
  reason: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const data = await prisma.stock_adjustments.findMany({
      include: {
        items: {
          select: { name: true },
        },
        users: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/inventory/adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('admin');

    const body = await req.json();
    const parsedBody = adjustmentSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // 1. Insert adjustment record
      await tx.stock_adjustments.create({
        data: {
          item_id: parsedBody.item_id,
          user_id: session.user.staffId,
          qty_change: parsedBody.qty_change,
          reason: parsedBody.reason,
          notes: parsedBody.notes,
        } satisfies Prisma.stock_adjustmentsUncheckedCreateInput,
      });

      // 2. Update item stock
      await tx.items.update({
        where: { id: parsedBody.item_id },
        data: {
          stock: {
            increment: parsedBody.qty_change, // Handles both positive and negative values correctly
          },
        },
      });
    });

    return NextResponse.json({ message: 'Stock adjustment created successfully' }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
    }
    // Handle case where item doesn't exist
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
       return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    console.error('POST /api/inventory/adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
