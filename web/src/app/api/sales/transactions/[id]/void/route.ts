import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { handleApiError, ApiError } from '@/lib/api';
import { computeRefund } from '@/lib/sales-pricing';

const D = Prisma.Decimal;

const voidSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.number().int(),
        qty: z.number().int().positive(),
        refund_amount: z.number().nonnegative(),
      }),
    )
    .min(1),
  reason: z.string().optional(),
});

/**
 * Restore returned units back into the exact stock lots the original sale consumed
 * (reverse of owned-first depletion, most-recent consumption first). Reduces the
 * consumption ledger so consignment debt for returned goods is removed too, and
 * re-activates any lot that had been fully depleted. Lots already RETURNED to the
 * supplier are NOT resurrected (their stock is gone from our arrangement). Legacy
 * sales (made before lot tracking) have no consumption rows → only items.stock is
 * restored, handled by caller.
 */
async function restoreLots(
  tx: Prisma.TransactionClient,
  transactionId: string,
  itemId: number,
  qtyToRestore: number,
): Promise<void> {
  const tis = await tx.transaction_items.findMany({
    where: { transaction_id: transactionId, item_id: itemId },
    select: { id: true },
  });
  const tiIds = tis.map((t) => t.id);
  if (tiIds.length === 0) return;

  const consumptions = await tx.stock_lot_consumptions.findMany({
    where: { transaction_item_id: { in: tiIds }, qty: { gt: 0 } },
    orderBy: { id: 'desc' },
  });

  let remaining = qtyToRestore;
  for (const c of consumptions) {
    if (remaining <= 0) break;
    const give = Math.min(remaining, c.qty);

    // Don't resurrect a consignment lot already returned to the supplier: those
    // units are physically gone from our arrangement, so re-activating the lot
    // would make returned stock sellable again. The customer's physical return is
    // still reflected in items.stock by the caller. Only re-stock lots still ours.
    const lot = await tx.stock_lots.findUnique({
      where: { id: c.stock_lot_id },
      select: { status: true },
    });
    if (lot && lot.status !== 'RETURNED') {
      await tx.stock_lots.update({
        where: { id: c.stock_lot_id },
        data: { qty_remaining: { increment: give }, status: 'ACTIVE' },
      });
    }

    // Always reduce the consumption so consignment debt for the refunded units is
    // removed, consistent with how voids reverse debt for non-returned lots.
    await tx.stock_lot_consumptions.update({
      where: { id: c.id },
      data: { qty: c.qty - give },
    });
    remaining -= give;
  }
}

// POST void/refund — admin & kasir. Kasir perlu void saat customer batal/ganti
// item setelah transaksi diinput; stok & lot dikembalikan oleh logika di bawah.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('admin', 'kasir');
    const { id } = await props.params;
    const input = voidSchema.parse(await req.json());
    const reason = input.reason || 'Returned Goods';

    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transactions.findUnique({ where: { id } });
      if (!trx) throw new ApiError(404, 'Transaksi tidak ditemukan');

      let totalRefund = new D(0);

      for (const it of input.items) {
        await tx.void_items.create({
          data: {
            transaction_id: id,
            item_id: it.item_id,
            qty: it.qty,
            refund_amount: new D(it.refund_amount),
            reason,
            executed_by: session.user.staffId ?? null,
          } satisfies Prisma.void_itemsUncheckedCreateInput,
        });

        totalRefund = totalRefund.plus(new D(it.refund_amount));

        // Kembalikan stok hanya jika barang dikembalikan.
        if (reason === 'Returned Goods') {
          await tx.items.updateMany({ where: { id: it.item_id }, data: { stock: { increment: it.qty } } });
          await restoreLots(tx, id, it.item_id, it.qty);
        }
      }

      if (totalRefund.greaterThan(0)) {
        const { newRefunds, newNetSales, fullyRefunded } = computeRefund({
          currentRefunds: new D(trx.refunds ?? 0),
          netSales: new D(trx.net_sales ?? trx.total),
          total: new D(trx.total),
          totalRefund,
        });

        await tx.transactions.update({
          where: { id },
          data: {
            refunds: newRefunds,
            net_sales: newNetSales,
            ...(fullyRefunded ? { status: 'void' } : {}),
          },
        });
      }

      return totalRefund;
    });

    return NextResponse.json({ message: 'Void items processed successfully', total_refund: Number(result) });
  } catch (error) {
    return handleApiError(error, 'POST /api/sales/transactions/[id]/void');
  }
}

