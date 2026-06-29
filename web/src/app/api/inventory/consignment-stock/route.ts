import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { Prisma } from '@prisma/client';

/**
 * Consignment stock report grouped by supplier: per item received / sold / remaining
 * (from stock_lots) plus the supplier's running unbilled debt (from the consumption
 * ledger). Read-only; powers Inventory → Consignment tab.
 */
export async function GET() {
  try {
    await requireRole('admin');

    const lots = await prisma.$queryRaw<Array<{
      supplier_id: number | null;
      supplier_name: string | null;
      code: string;
      item_name: string;
      unit_cost: string;
      received_at_date: string | Date;
      received: number | string;
      remaining: number | string;
    }>>(Prisma.sql`
      SELECT sl.supplier_id,
             s.name AS supplier_name,
             i.code,
             i.name AS item_name,
             sl.unit_cost,
             DATE(sl.received_at) AS received_at_date,
             SUM(sl.qty_received) AS received,
             SUM(sl.qty_remaining) AS remaining
      FROM stock_lots sl
      JOIN items i ON i.id = sl.item_id
      LEFT JOIN suppliers s ON s.id = sl.supplier_id
      WHERE sl.source_type = 'CONSIGNMENT'
      GROUP BY sl.supplier_id, s.name, i.code, i.name, sl.unit_cost, DATE(sl.received_at)
      ORDER BY s.name, DATE(sl.received_at) DESC, i.name
    `);

    const debts = await prisma.$queryRaw<Array<{ supplier_id: number | null; debt: string }>>(Prisma.sql`
      SELECT sl.supplier_id, SUM(c.qty * c.unit_cost) AS debt
      FROM stock_lot_consumptions c
      JOIN stock_lots sl ON sl.id = c.stock_lot_id
      WHERE sl.source_type = 'CONSIGNMENT' AND c.settled = false AND c.qty > 0
      GROUP BY sl.supplier_id
    `);
    const debtMap = new Map(debts.map((d) => [d.supplier_id ?? -1, Number(d.debt)]));

    // Per-lot rows for aging + pull-back: only ACTIVE consignment lots that still
    // hold unsold stock. expires_at drives the period; null = open-ended.
    const lotRows = await prisma.$queryRaw<Array<{
      lot_id: number;
      supplier_id: number | null;
      code: string;
      item_name: string;
      unit_cost: string;
      qty_remaining: number | string;
      received_at: Date;
      expires_at: Date | null;
    }>>(Prisma.sql`
      SELECT sl.id AS lot_id,
             sl.supplier_id,
             i.code,
             i.name AS item_name,
             sl.unit_cost,
             sl.qty_remaining,
             sl.received_at,
             sl.expires_at
      FROM stock_lots sl
      JOIN items i ON i.id = sl.item_id
      WHERE sl.source_type = 'CONSIGNMENT' AND sl.status = 'ACTIVE' AND sl.qty_remaining > 0
      ORDER BY sl.expires_at ASC NULLS LAST, sl.received_at ASC
    `);

    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    type LotAging = {
      lot_id: number;
      code: string;
      name: string;
      unit_cost: number;
      remaining: number;
      received_at: string;
      expires_at: string | null;
      days_remaining: number | null;
      is_overdue: boolean;
    };
    const lotsBySupplier = new Map<number, LotAging[]>();
    for (const r of lotRows) {
      const key = r.supplier_id ?? -1;
      const daysRemaining =
        r.expires_at != null
          ? Math.ceil((new Date(r.expires_at).getTime() - now) / MS_PER_DAY)
          : null;
      const lot: LotAging = {
        lot_id: r.lot_id,
        code: r.code,
        name: r.item_name,
        unit_cost: Number(r.unit_cost),
        remaining: Number(r.qty_remaining),
        received_at: new Date(r.received_at).toISOString(),
        expires_at: r.expires_at != null ? new Date(r.expires_at).toISOString() : null,
        days_remaining: daysRemaining,
        is_overdue: daysRemaining != null && daysRemaining < 0,
      };
      const list = lotsBySupplier.get(key);
      if (list) list.push(lot);
      else lotsBySupplier.set(key, [lot]);
    }

    // Group lot rows by supplier.
    const bySupplier = new Map<number, {
      supplier_id: number | null;
      supplier_name: string;
      running_debt: number;
      total_received: number;
      total_remaining: number;
      items: Array<{ date: string; code: string; name: string; unit_cost: number; received: number; sold: number; remaining: number }>;
      lots: LotAging[];
      overdue_count: number;
    }>();

    for (const r of lots) {
      const key = r.supplier_id ?? -1;
      const received = Number(r.received);
      const remaining = Number(r.remaining);
      if (!bySupplier.has(key)) {
        bySupplier.set(key, {
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_name ?? 'Unknown',
          running_debt: debtMap.get(key) ?? 0,
          total_received: 0,
          total_remaining: 0,
          items: [],
          lots: [],
          overdue_count: 0,
        });
      }
      const group = bySupplier.get(key)!;
      group.items.push({
        date: new Date(r.received_at_date).toISOString(),
        code: r.code,
        name: r.item_name,
        unit_cost: Number(r.unit_cost),
        received,
        sold: received - remaining,
        remaining,
      });
      group.total_received += received;
      group.total_remaining += remaining;
    }

    // Attach per-lot aging. A supplier may have active lots even when the aggregated
    // query already created its group; ensure a group exists either way.
    for (const [key, lots] of lotsBySupplier) {
      let group = bySupplier.get(key);
      if (!group) {
        // Defensive: aggregated query already covers every consignment supplier,
        // so this branch is normally unreachable.
        group = {
          supplier_id: key === -1 ? null : key,
          supplier_name: 'Unknown',
          running_debt: debtMap.get(key) ?? 0,
          total_received: 0,
          total_remaining: 0,
          items: [],
          lots: [],
          overdue_count: 0,
        };
        bySupplier.set(key, group);
      }
      group.lots = lots;
      group.overdue_count = lots.filter((l) => l.is_overdue).length;
    }

    return NextResponse.json({ data: Array.from(bySupplier.values()) });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/inventory/consignment-stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
