import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const createSchema = z.object({
  category_id: z.number().int(),
  amount: z.number().positive(),
  expense_date: z.string(), // ISO date string or YYYY-MM-DD
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole('admin');
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    let where = {};
    if (start && end) {
      where = {
        expense_date: {
          gte: new Date(start),
          lte: new Date(end),
        }
      };
    }

    const expenses = await prisma.expenses.findMany({
      where,
      include: {
        expense_categories: { select: { name: true, account_code: true } },
        users: { select: { name: true } },
      },
      orderBy: { expense_date: 'desc' },
    });
    return NextResponse.json({ data: expenses });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/finance/expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('admin');
    const body = await req.json();
    const parsed = createSchema.parse(body);

    if (!session.user.staffId) {
      throw new AuthError(403, 'User is not associated with a staff account');
    }

    const expense = await prisma.expenses.create({
      data: {
        category_id: parsed.category_id,
        amount: parsed.amount,
        notes: parsed.notes,
        expense_date: new Date(parsed.expense_date),
        created_by: session.user.staffId,
      }
    });
    return NextResponse.json({ message: 'Expense recorded', data: expense }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/finance/expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
