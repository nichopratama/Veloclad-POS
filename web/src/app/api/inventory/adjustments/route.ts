import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { createOwnedLot, depleteLotsOwnedFirst } from '@/lib/stock-lots';

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
      // 1. Guard: item exists and the adjustment won't push stock below 0
      const item = await tx.items.findUnique({
        where: { id: parsedBody.item_id },
        select: { stock: true, hpp: true },
      });
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if ((item.stock ?? 0) + parsedBody.qty_change < 0) throw new Error('NEGATIVE_STOCK');

      // 2. Insert adjustment record
      await tx.stock_adjustments.create({
        data: {
          item_id: parsedBody.item_id,
          user_id: session.user.staffId,
          qty_change: parsedBody.qty_change,
          reason: parsedBody.reason,
          notes: parsedBody.notes,
        } satisfies Prisma.stock_adjustmentsUncheckedCreateInput,
      });

      // 3. Update item stock
      await tx.items.update({
        where: { id: parsedBody.item_id },
        data: {
          stock: {
            increment: parsedBody.qty_change, // Handles both positive and negative values correctly
          },
        },
      });

      // 4. Keep stock lots in sync: positive → add an OWNED lot (valued at item cost),
      // negative → deplete lots owned-first. Prevents items.stock vs Σ lots drift.
      if (parsedBody.qty_change > 0) {
        await createOwnedLot(tx, parsedBody.item_id, parsedBody.qty_change, item.hpp ?? 0);
      } else {
        await depleteLotsOwnedFirst(tx, parsedBody.item_id, -parsedBody.qty_change);
      }
    });

    return NextResponse.json({ message: 'Stock adjustment created successfully' }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'NEGATIVE_STOCK') {
      return NextResponse.json({ error: 'Stock cannot go below 0 with this adjustment' }, { status: 400 });
    }
    // Handle case where item doesn't exist
    if (
      (error instanceof Error && error.message === 'ITEM_NOT_FOUND') ||
      (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025')
    ) {
       return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    console.error('POST /api/inventory/adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
