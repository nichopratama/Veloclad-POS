import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from './errors';
import type { SaleLine } from './sales-pricing';

/**
 * Inti penulisan transaksi ke DB (uang + stok) — diekstrak dari route handler
 * agar invarian yang BERGANTUNG DB bisa diuji integrasi terhadap Postgres nyata:
 *   - anti-oversell ATOMIK: decrement stok hanya bila stock >= qty (updateMany
 *     bersyarat); count==0 → lempar → seluruh $transaction rollback.
 *   - idempotency: unique index `transactions_idempotency_key_unique` sbg backstop
 *     race (insert kedua dgn key sama → P2002).
 *
 * Pre-check idempotency yang ramah (findUnique→replay) tetap di route; di sini
 * UNIQUE constraint adalah jaring pengaman terakhir.
 */
export interface PersistSaleParams {
  transactionId: string;
  idemKey: string | null;
  userId: number | null;
  customerId: number | null;
  paymentTypeId: number | null;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  paymentAmount: Prisma.Decimal;
  change: Prisma.Decimal;
  lines: SaleLine[];
}

/** Klien minimal: PrismaClient asli ATAU instance test — cukup punya $transaction. */
type SaleDbClient = Pick<PrismaClient, '$transaction'>;

export async function persistSale(client: SaleDbClient, p: PersistSaleParams): Promise<string> {
  return client.$transaction(async (tx) => {
    await tx.transactions.create({
      data: {
        id: p.transactionId,
        user_id: p.userId,
        customer_id: p.customerId,
        payment_type_id: p.paymentTypeId,
        subtotal: p.subtotal,
        tax_amount: p.taxAmount,
        discount_amount: p.discountTotal,
        total: p.total,
        net_sales: p.total,
        payment_amount: p.paymentAmount,
        change_amount: p.change,
        status: 'completed',
        idempotency_key: p.idemKey,
      } satisfies Prisma.transactionsUncheckedCreateInput,
    });

    for (const line of p.lines) {
      // Anti-oversell race-safe: decrement HANYA jika stock >= qty (atomic).
      const upd = await tx.items.updateMany({
        where: { id: line.id, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (upd.count === 0) {
        throw new ApiError(400, `Stok tidak cukup atau item ${line.id} tidak ditemukan`);
      }

      await tx.transaction_items.create({
        data: {
          transaction_id: p.transactionId,
          item_id: line.id,
          price: line.price,
          qty: line.qty,
          subtotal: line.lineGross,
          discount: line.discount,
        } satisfies Prisma.transaction_itemsUncheckedCreateInput,
      });
    }

    return p.transactionId;
  });
}
