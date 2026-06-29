import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';

/**
 * PATCH — return a consignment lot's UNSOLD stock to the supplier (pull-back at end
 * of the consignment period). Only the remaining (unsold) quantity is affected:
 *   - items.stock decremented by qty_remaining
 *   - lot marked RETURNED, qty_remaining zeroed
 * No payable is created — unsold units were never owed. Units already sold stay
 * billable via the normal consignment settlement (their consumptions are untouched).
 *
 * Guards: lot must exist, be source_type=CONSIGNMENT and status=ACTIVE.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock the lot row to avoid racing a concurrent sale that depletes it.
      const rows = await tx.$queryRaw<Array<{
        id: number;
        item_id: number;
        source_type: string;
        status: string;
        qty_remaining: number;
      }>>`
        SELECT id, item_id, source_type, status, qty_remaining
        FROM stock_lots
        WHERE id = ${id}
        FOR UPDATE
      `;

      const lot = rows[0];
      if (!lot) {
        throw new Error('LOT_NOT_FOUND');
      }
      if (lot.source_type !== 'CONSIGNMENT') {
        throw new Error('NOT_CONSIGNMENT');
      }
      if (lot.status !== 'ACTIVE') {
        throw new Error('LOT_NOT_ACTIVE');
      }

      const returnedQty = Number(lot.qty_remaining);

      if (returnedQty > 0) {
        await tx.items.update({
          where: { id: lot.item_id },
          data: { stock: { decrement: returnedQty } },
        });
      }

      await tx.stock_lots.update({
        where: { id: lot.id },
        data: { status: 'RETURNED', qty_remaining: 0 },
      });

      return { lot_id: lot.id, item_id: lot.item_id, returned_qty: returnedQty };
    });

    return NextResponse.json({ message: 'Consignment stock returned to supplier', ...result });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      if (error.message === 'LOT_NOT_FOUND') {
        return NextResponse.json({ error: 'Stock lot not found' }, { status: 404 });
      }
      if (error.message === 'NOT_CONSIGNMENT') {
        return NextResponse.json({ error: 'Only consignment lots can be returned' }, { status: 400 });
      }
      if (error.message === 'LOT_NOT_ACTIVE') {
        return NextResponse.json({ error: 'Lot is already depleted or returned' }, { status: 400 });
      }
    }
    console.error('PATCH /api/inventory/stock-lots/[id]/return error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
