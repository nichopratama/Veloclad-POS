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

type LotAllocation = { lotId: number; qty: number; unitCost: Prisma.Decimal; willDeplete: boolean };
interface DepletionPlan {
  weightedUnitCost: Prisma.Decimal;
  allocations: LotAllocation[];
}

/**
 * Owned-first lot depletion plan for one sale line. Locks the item's ACTIVE lots
 * (FOR UPDATE) ordered OWNED before CONSIGNMENT, then FIFO by received_at, and
 * greedily allocates `qty`. Returns the weighted actual unit cost (true COGS) plus
 * the per-lot allocation so the caller can write the consumption ledger.
 *
 * If lots are short of `qty` (e.g. manual stock adjustments not reflected in lots),
 * the remainder is valued at `fallbackUnitCost` so COGS stays sane and the sale,
 * which already passed the items.stock anti-oversell gate, never blocks.
 */
async function planLotDepletion(
  tx: Prisma.TransactionClient,
  itemId: number,
  qty: number,
  fallbackUnitCost: Prisma.Decimal,
): Promise<DepletionPlan> {
  const lots = await tx.$queryRaw<Array<{ id: number; unit_cost: string; qty_remaining: number }>>(
    Prisma.sql`
      SELECT id, unit_cost, qty_remaining
      FROM stock_lots
      WHERE item_id = ${itemId} AND status = 'ACTIVE' AND qty_remaining > 0
      ORDER BY (source_type = 'CONSIGNMENT') ASC, received_at ASC, id ASC
      FOR UPDATE
    `,
  );

  const allocations: LotAllocation[] = [];
  let remaining = qty;
  let totalCost = new Prisma.Decimal(0);

  for (const lot of lots) {
    if (remaining <= 0) break;
    const avail = Number(lot.qty_remaining);
    const take = Math.min(remaining, avail);
    const unitCost = new Prisma.Decimal(String(lot.unit_cost));
    allocations.push({ lotId: lot.id, qty: take, unitCost, willDeplete: take >= avail });
    totalCost = totalCost.plus(unitCost.times(take));
    remaining -= take;
  }

  if (remaining > 0) {
    totalCost = totalCost.plus(fallbackUnitCost.times(remaining));
  }

  const weightedUnitCost = qty > 0 ? totalCost.dividedBy(qty) : fallbackUnitCost;
  return { weightedUnitCost, allocations };
}

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

      // Owned-first lot depletion → actual weighted COGS + consumption ledger.
      const plan = await planLotDepletion(tx, line.id, line.qty, line.costPrice);

      const ti = await tx.transaction_items.create({
        data: {
          transaction_id: p.transactionId,
          item_id: line.id,
          price: line.price,
          qty: line.qty,
          subtotal: line.lineGross,
          discount: line.discount,
          cost_price: plan.weightedUnitCost,
        } satisfies Prisma.transaction_itemsUncheckedCreateInput,
      });

      for (const a of plan.allocations) {
        await tx.stock_lots.update({
          where: { id: a.lotId },
          data: {
            qty_remaining: { decrement: a.qty },
            ...(a.willDeplete ? { status: 'DEPLETED' } : {}),
          },
        });
        await tx.stock_lot_consumptions.create({
          data: {
            transaction_item_id: ti.id,
            stock_lot_id: a.lotId,
            qty: a.qty,
            unit_cost: a.unitCost,
          },
        });
      }
    }

    return p.transactionId;
  });
}
