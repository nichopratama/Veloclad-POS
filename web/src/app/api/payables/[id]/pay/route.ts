import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const paymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string().optional(),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');

    const params = await props.params;
    const payableId = parseInt(params.id, 10);
    if (isNaN(payableId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = paymentSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get Payable
      const payable = await tx.payables.findUnique({ where: { id: payableId } });
      if (!payable) throw new Error('PAYABLE_NOT_FOUND');
      
      const currentPaid = Number(payable.amount_paid);
      const totalDebt = Number(payable.total_debt);
      const newPaid = currentPaid + parsedBody.amount;

      if (newPaid > totalDebt) {
        throw new Error('PAYMENT_EXCEEDS_DEBT');
      }

      const newStatus = newPaid >= totalDebt ? 'PAID' : 'PARTIAL';

      // 2. Update Payable
      await tx.payables.update({
        where: { id: payableId },
        data: {
          amount_paid: newPaid,
          status: newStatus,
        },
      });

      // 3. Create Payment Record
      await tx.payable_payments.create({
        data: {
          payable_id: payableId,
          amount: parsedBody.amount,
          payment_method: parsedBody.payment_method,
          reference_no: parsedBody.reference_no,
          notes: parsedBody.notes,
        }
      });

      // 4. If payable is tied to a PO, update PO status if fully paid
      if (payable.po_id) {
        // Since a PO might have multiple payables (in the future or consignment),
        // we'll just check if this specific payable is PAID.
        // For CREDIT POs, 1 PO = 1 Payable.
        if (newStatus === 'PAID') {
          await tx.purchase_orders.update({
            where: { id: payable.po_id },
            data: { payment_status: 'PAID' }
          });
        } else {
          await tx.purchase_orders.update({
            where: { id: payable.po_id },
            data: { payment_status: 'PARTIAL' }
          });
        }
      }

      return { newStatus, newPaid };
    });

    return NextResponse.json({ message: 'Payment recorded successfully', ...result });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'PAYABLE_NOT_FOUND') return NextResponse.json({ error: 'Payable not found' }, { status: 404 });
      if (error.message === 'PAYMENT_EXCEEDS_DEBT') return NextResponse.json({ error: 'Payment amount exceeds remaining debt' }, { status: 400 });
    }
    console.error('POST /api/payables/[id]/pay error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
