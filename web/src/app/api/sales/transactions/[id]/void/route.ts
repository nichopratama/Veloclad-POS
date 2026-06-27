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

// POST void/refund — hanya admin (D7).
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('admin');
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

