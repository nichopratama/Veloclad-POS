import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const settlementSchema = z.object({
  supplier_id: z.number().int(),
  amount: z.number().positive(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const parsed = settlementSchema.parse(body);

    const payable = await prisma.payables.create({
      data: {
        supplier_id: parsed.supplier_id,
        type: 'CONSIGNMENT_SETTLEMENT',
        total_debt: parsed.amount,
        amount_paid: 0,
        status: 'OPEN',
        due_date: parsed.due_date ? new Date(parsed.due_date) : null,
        // we can store notes in a relation or just keep it simple.
        // since we didn't add 'notes' to payables in schema, we'll skip notes or add it if needed later.
      }
    });

    return NextResponse.json({ message: 'Consignment settlement created', data: payable }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/payables/settle-consignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
