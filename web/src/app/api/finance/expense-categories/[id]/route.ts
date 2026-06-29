import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  account_code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const updated = await prisma.expense_categories.update({
      where: { id: parseInt(id) },
      data: parsed,
    });
    return NextResponse.json({ message: 'Category updated', data: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('PUT /api/finance/expense-categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('admin');
    const { id } = await params;
    
    // Check if it's used
    const inUse = await prisma.expenses.findFirst({
      where: { category_id: parseInt(id) },
    });
    if (inUse) {
      return NextResponse.json({ error: 'Category is in use and cannot be deleted' }, { status: 400 });
    }

    await prisma.expense_categories.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ message: 'Category deleted' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/finance/expense-categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
