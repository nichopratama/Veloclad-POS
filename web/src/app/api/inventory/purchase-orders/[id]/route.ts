import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const poItemSchema = z.object({
  item_id: z.number().int(),
  qty: z.number().int().positive(),
  cost: z.number().nonnegative(),
});

const purchaseOrderUpdateSchema = z.object({
  supplier_id: z.number().int(),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(['CASH', 'CREDIT', 'CONSIGNMENT']).default('CASH'),
  due_date: z.string().optional().nullable(), // ISO date string
  consignment_days: z.number().int().positive().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = purchaseOrderUpdateSchema.parse(body);

    const po = await prisma.purchase_orders.findUnique({
      where: { id }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (po.status === 'received') {
      return NextResponse.json({ error: 'PO yang sudah diterima (received) tidak bisa diedit' }, { status: 400 });
    }

    // Calculate total amount
    const totalAmount = parsedBody.items.reduce((sum, item) => sum + (item.cost * item.qty), 0);

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

    await prisma.$transaction(async (tx) => {
      // Hapus item lama
      await tx.po_items.deleteMany({
        where: { po_id: id }
      });

      // Update PO dan buat item baru
      await tx.purchase_orders.update({
        where: { id },
        data: {
          supplier_id: parsedBody.supplier_id,
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
        }
      });
    });

    return NextResponse.json({ message: 'Purchase order updated successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
    }
    console.error('PATCH /api/inventory/purchase-orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const po = await prisma.purchase_orders.findUnique({
      where: { id }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (po.status === 'received') {
      return NextResponse.json({ error: 'Hanya PO dengan status pending/needs_approval yang bisa dihapus' }, { status: 400 });
    }

    // Karena relasi po_items memiliki onDelete: Cascade, kita hanya perlu menghapus data induknya saja
    await prisma.purchase_orders.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Purchase order berhasil dihapus' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/inventory/purchase-orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
