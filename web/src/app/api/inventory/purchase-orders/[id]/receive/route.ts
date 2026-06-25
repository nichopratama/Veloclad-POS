import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Use transaction to ensure PO status update and stock increments are atomic
    await prisma.$transaction(async (tx) => {
      // 1. Guard PO exists and is pending
      const po = await tx.purchase_orders.findUnique({
        where: { id },
        include: { po_items: true },
      });

      if (!po) {
        throw new Error('PO_NOT_FOUND');
      }
      if (po.status !== 'pending') {
        throw new Error('PO_ALREADY_RECEIVED_OR_INVALID');
      }

      // 2. Update PO status
      await tx.purchase_orders.update({
        where: { id },
        data: { status: 'received' },
      });

      // 3. Increment stock for each item
      for (const item of po.po_items) {
        if (!item.item_id) continue;
        
        await tx.items.update({
          where: { id: item.item_id },
          data: {
            stock: {
              increment: item.qty,
            },
          },
        });
      }
    });

    return NextResponse.json({ message: 'Purchase order received successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      if (error.message === 'PO_NOT_FOUND') {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      if (error.message === 'PO_ALREADY_RECEIVED_OR_INVALID') {
        return NextResponse.json({ error: 'Purchase order has already been received or is not pending' }, { status: 400 });
      }
    }
    console.error('PATCH /api/inventory/purchase-orders/[id]/receive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
