import { Prisma } from '@prisma/client';

/**
 * Shared stock-lot helpers for non-sale stock movements (manual adjustments).
 * Sale-time depletion lives in sales-persist.ts because it also writes the COGS
 * consumption ledger; these helpers only keep lot quantities in sync with
 * items.stock so owned/consignment accounting does not drift.
 */

/** Add an OWNED lot (e.g. a positive manual stock adjustment), valued at the item's cost. */
export async function createOwnedLot(
  tx: Prisma.TransactionClient,
  itemId: number,
  qty: number,
  unitCost: Prisma.Decimal | number,
): Promise<void> {
  await tx.stock_lots.create({
    data: {
      item_id: itemId,
      source_type: 'OWNED',
      unit_cost: new Prisma.Decimal(unitCost),
      qty_received: qty,
      qty_remaining: qty,
      status: 'ACTIVE',
    },
  });
}

/**
 * Deplete ACTIVE lots owned-first (then FIFO) by `qty` for a manual stock reduction.
 * No COGS ledger is written — this is inventory shrinkage/correction, not a sale.
 * Lots are locked FOR UPDATE to stay race-safe with concurrent sales.
 */
export async function depleteLotsOwnedFirst(
  tx: Prisma.TransactionClient,
  itemId: number,
  qty: number,
): Promise<void> {
  const lots = await tx.$queryRaw<Array<{ id: number; qty_remaining: number }>>(
    Prisma.sql`
      SELECT id, qty_remaining FROM stock_lots
      WHERE item_id = ${itemId} AND status = 'ACTIVE' AND qty_remaining > 0
      ORDER BY (source_type = 'CONSIGNMENT') ASC, received_at ASC, id ASC
      FOR UPDATE
    `,
  );

  let remaining = qty;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const avail = Number(lot.qty_remaining);
    const take = Math.min(remaining, avail);
    await tx.stock_lots.update({
      where: { id: lot.id },
      data: {
        qty_remaining: { decrement: take },
        ...(take >= avail ? { status: 'DEPLETED' } : {}),
      },
    });
    remaining -= take;
  }
}
