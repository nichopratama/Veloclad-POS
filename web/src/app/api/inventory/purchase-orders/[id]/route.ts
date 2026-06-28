import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';

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

    if (po.status !== 'pending') {
      return NextResponse.json({ error: 'Hanya PO dengan status pending yang bisa dihapus' }, { status: 400 });
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
