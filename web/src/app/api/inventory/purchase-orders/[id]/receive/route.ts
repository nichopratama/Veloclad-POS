import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { broadcastNotification } from '@/lib/notifications';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Use transaction to ensure PO status update and stock increments are atomic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Guard PO exists and is pending
      const po = await tx.purchase_orders.findUnique({
        where: { id },
        include: { po_items: true },
      });

      if (!po) {
        throw new Error('PO_NOT_FOUND');
      }
      if (po.status !== 'pending') {
        throw new Error('PO_ALREADY_RECEIVED_OR_INVALID');
      }

      // 2. Update PO status
      await tx.purchase_orders.update({
        where: { id },
        data: { status: 'received' },
      });

      // 3. Increment stock + create a stock lot for each item.
      // Consignment POs create CONSIGNMENT lots (debt accrues only as they sell);
      // cash/credit POs create OWNED lots. unit_cost is the per-PO purchase cost.
      const lotSource = po.payment_method === 'CONSIGNMENT' ? 'CONSIGNMENT' : 'OWNED';

      // Consignment period: lot expires `consignment_days` after receipt. Null term
      // (supplier never set a default and PO left it blank) => open-ended, no expiry.
      const receivedAt = new Date();
      const expiresAt =
        lotSource === 'CONSIGNMENT' && po.consignment_days != null
          ? new Date(receivedAt.getTime() + po.consignment_days * 24 * 60 * 60 * 1000)
          : null;

      for (const item of po.po_items) {
        if (!item.item_id) continue;

        await tx.items.update({
          where: { id: item.item_id },
          data: {
            stock: {
              increment: item.qty,
            },
          },
        });

        await tx.stock_lots.create({
          data: {
            item_id: item.item_id,
            source_type: lotSource,
            po_id: po.id,
            supplier_id: po.supplier_id,
            unit_cost: item.cost,
            qty_received: item.qty,
            qty_remaining: item.qty,
            status: 'ACTIVE',
            received_at: receivedAt,
            expires_at: expiresAt,
          },
        });
      }

      // 4. Create Payable logic
      if (po.supplier_id) {
        if (po.payment_method === 'CREDIT') {
          await tx.payables.create({
            data: {
              supplier_id: po.supplier_id,
              po_id: po.id,
              type: 'CREDIT_INVOICE',
              total_debt: po.total_amount ?? 0,
              amount_paid: 0,
              status: 'OPEN',
              due_date: po.due_date,
            }
          });
        } else if (po.payment_method === 'CASH') {
          // Buat Payable berstatus PAID langsung lunas beserta log pembayarannya
          await tx.payables.create({
            data: {
              supplier_id: po.supplier_id,
              po_id: po.id,
              type: 'CASH_INVOICE',
              total_debt: po.total_amount ?? 0,
              amount_paid: po.total_amount ?? 0,
              status: 'PAID',
              due_date: new Date(), // Lunas hari ini
              payable_payments: {
                create: {
                  amount: po.total_amount ?? 0,
                  payment_method: 'CASH',
                  notes: 'Direct cash payment from PO',
                }
              }
            }
          });
        }
      }

      // Return values needed for notification
      const itemCount = po.po_items.length;
      const totalQty = po.po_items.reduce((sum, item) => sum + item.qty, 0);
      return { poNumber: po.po_number, itemCount, totalQty };
    });

    // 5. Create notification for Cashiers outside transaction so it doesn't fail the PO process
    await broadcastNotification(['kasir'], {
      title: 'Stok Baru Masuk',
      message: `PO #${result.poNumber} telah diterima (${result.itemCount} jenis barang, total ${result.totalQty} qty). Stok diperbarui dan siap dijual.`,
      category: 'INVENTORY',
      type: 'INFO'
    });

    return NextResponse.json({ message: 'Purchase order received successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      if (error.message === 'PO_NOT_FOUND') {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      if (error.message === 'PO_ALREADY_RECEIVED_OR_INVALID') {
        return NextResponse.json({ error: 'Purchase order has already been received or is not pending' }, { status: 400 });
      }
    }
    console.error('PATCH /api/inventory/purchase-orders/[id]/receive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
