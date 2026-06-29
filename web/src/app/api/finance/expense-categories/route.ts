import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  account_code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireRole('admin');
    const categories = await prisma.expense_categories.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: categories });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/finance/expense-categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const category = await prisma.expense_categories.create({
      data: {
        name: parsed.name,
        account_code: parsed.account_code,
        description: parsed.description,
      }
    });
    return NextResponse.json({ message: 'Category created', data: category }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/finance/expense-categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
