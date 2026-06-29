import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const po = await prisma.purchase_orders.findUnique({
      where: { id },
      include: { po_items: true }
    });

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (po.status !== 'needs_approval') {
      return NextResponse.json({ error: 'Hanya PO dengan status needs_approval yang bisa diapprove' }, { status: 400 });
    }

    // Zero-cost validation
    const hasZeroCost = po.po_items.some(item => Number(item.cost) <= 0);
    if (hasZeroCost) {
      return NextResponse.json({ error: 'Terdapat barang dengan harga 0. Harap Edit PO dan masukkan harga beli yang benar sebelum melakukan Approval.' }, { status: 400 });
    }

    await prisma.purchase_orders.update({
      where: { id },
      data: { status: 'pending' }
    });

    return NextResponse.json({ message: 'Purchase order approved successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH /api/inventory/purchase-orders/[id]/approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
