import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const poItemSchema = z.object({
  item_id: z.number().int(),
  qty: z.number().int().positive(),
  cost: z.number().nonnegative(),
});

const purchaseOrderSchema = z.object({
  supplier_id: z.number().int(),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(['CASH', 'CREDIT', 'CONSIGNMENT']).default('CASH'),
  due_date: z.string().optional().nullable(), // ISO date string
  consignment_days: z.number().int().positive().optional().nullable(), // masa konsinyasi (hari)
  items: z.array(poItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const data = await prisma.purchase_orders.findMany({
      include: {
        suppliers: {
          select: { name: true },
        },
        users: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' }, // Order by creation date descending
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/inventory/purchase-orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('admin');

    const body = await req.json();
    const parsedBody = purchaseOrderSchema.parse(body);

    // Calculate total amount
    const totalAmount = parsedBody.items.reduce((sum, item) => sum + (item.cost * item.qty), 0);

    // Resolve consignment term: explicit PO value wins, else fall back to the
    // supplier's default. Only meaningful for CONSIGNMENT POs.
    let consignmentDays: number | null = null;
    if (parsedBody.payment_method === 'CONSIGNMENT') {
      if (parsedBody.consignment_days != null) {
        consignmentDays = parsedBody.consignment_days;
      } else {
        const supplier = await prisma.suppliers.findUnique({
          where: { id: parsedBody.supplier_id },
          select: { consignment_days: true },
        });
        consignmentDays = supplier?.consignment_days ?? null;
      }
    }

    // Generate PO number: PO-YYYYMMDD-XXXX (XXXX acak — hindari race condition counter)
    const dateString = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const poNumber = `PO-${dateString}-${randomBytes(2).toString('hex').toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Insert PO and po_items
      const newPO = await tx.purchase_orders.create({
        data: {
          po_number: poNumber,
          supplier_id: parsedBody.supplier_id,
          user_id: session.user.staffId,
          status: 'pending',
          payment_method: parsedBody.payment_method,
          payment_status: parsedBody.payment_method === 'CASH' ? 'PAID' : 'UNPAID',
          due_date: parsedBody.due_date ? new Date(parsedBody.due_date) : null,
          consignment_days: consignmentDays,
          total_amount: totalAmount,
          notes: parsedBody.notes,
          po_items: {
            create: parsedBody.items.map(item => ({
              item_id: item.item_id,
              qty: item.qty,
              cost: item.cost,
              subtotal: item.cost * item.qty,
            })),
          },
        } satisfies Prisma.purchase_ordersUncheckedCreateInput,
      });

      return newPO;
    });

    return NextResponse.json({
      message: 'Purchase order created successfully',
      po_number: result.po_number,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // po_number bentrok (sangat jarang) — minta klien coba lagi.
      return NextResponse.json({ error: 'PO number collision, silakan coba lagi' }, { status: 409 });
    }
    console.error('POST /api/inventory/purchase-orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
