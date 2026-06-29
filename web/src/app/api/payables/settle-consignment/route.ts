import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireAuth, AuthError } from '@/lib/rbac';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET — unsettled consignment debt per supplier, computed from the sale consumption
 * ledger: Σ(qty × unit_cost) for CONSIGNMENT lots whose consumptions are not yet
 * billed. This is what powers the "Calculate Consignment Debt" screen.
 */
export async function GET() {
  try {
    await requireAuth();

    const rows = await prisma.$queryRaw<Array<{
      supplier_id: number | null;
      supplier_name: string | null;
      unsettled_qty: number | string;
      unsettled_amount: string;
    }>>(Prisma.sql`
      SELECT sl.supplier_id,
             s.name AS supplier_name,
             SUM(c.qty) AS unsettled_qty,
             SUM(c.qty * c.unit_cost) AS unsettled_amount
      FROM stock_lot_consumptions c
      JOIN stock_lots sl ON sl.id = c.stock_lot_id
      LEFT JOIN suppliers s ON s.id = sl.supplier_id
      WHERE sl.source_type = 'CONSIGNMENT' AND c.settled = false AND c.qty > 0
      GROUP BY sl.supplier_id, s.name
      HAVING SUM(c.qty) > 0
      ORDER BY SUM(c.qty * c.unit_cost) DESC
    `);

    const data = rows.map((r) => ({
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name ?? 'Unknown',
      unsettled_qty: Number(r.unsettled_qty),
      unsettled_amount: Number(r.unsettled_amount),
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/payables/settle-consignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const settlementSchema = z.object({
  supplier_id: z.number().int(),
  due_date: z.string().optional().nullable(),
});

/**
 * POST — create a consignment payable for ONE supplier, with the amount computed
 * automatically from sold-but-unbilled consignment units, then mark those
 * consumptions settled so they are not billed twice.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const parsed = settlementSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Lock the unsettled consignment consumptions for this supplier.
      const rows = await tx.$queryRaw<Array<{ id: number; amount: string; po_id: number | null }>>(Prisma.sql`
        SELECT c.id, (c.qty * c.unit_cost) AS amount, sl.po_id
        FROM stock_lot_consumptions c
        JOIN stock_lots sl ON sl.id = c.stock_lot_id
        WHERE sl.source_type = 'CONSIGNMENT' AND sl.supplier_id = ${parsed.supplier_id}
          AND c.settled = false AND c.qty > 0
        FOR UPDATE
      `);

      if (rows.length === 0) {
        throw new Error('NO_UNSETTLED');
      }

      const totalDebt = rows.reduce((sum, r) => sum.plus(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0));
      const ids = rows.map((r) => r.id);

      // Attribute the settlement to a PO only when every settled unit traces back to
      // exactly one PO. Settlements spanning multiple consignment deliveries (or lots
      // with no PO) legitimately have no single reference and stay null.
      const poIds = new Set(rows.map((r) => r.po_id));
      const singlePoId = poIds.size === 1 ? [...poIds][0] : null;

      const payable = await tx.payables.create({
        data: {
          supplier_id: parsed.supplier_id,
          po_id: singlePoId,
          type: 'CONSIGNMENT_SETTLEMENT',
          total_debt: totalDebt,
          amount_paid: 0,
          status: 'OPEN',
          due_date: parsed.due_date ? new Date(parsed.due_date) : null,
        },
      });

      await tx.stock_lot_consumptions.updateMany({
        where: { id: { in: ids } },
        data: { settled: true },
      });

      return { payable, total_debt: Number(totalDebt), settled_count: ids.length };
    });

    return NextResponse.json({ message: 'Consignment settlement created', ...result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'NO_UNSETTLED') {
      return NextResponse.json({ error: 'No unsettled consignment sales for this supplier' }, { status: 400 });
    }
    console.error('POST /api/payables/settle-consignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
