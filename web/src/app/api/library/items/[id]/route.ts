import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const itemUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category_id: z.number().int().nullish(),
  unit: z.string().optional(),
  hpp: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  min_stock: z.number().int().optional(),
  supplier_id: z.number().int().nullish(),
  stock: z.number().int().optional(),
  is_active: z.boolean().optional(),
  internal_id: z.string().nullish(),
  variant_name: z.string().nullish(),
  brand_name: z.string().nullish(),
  condition: z.string().nullish(),
  image_url: z.string().nullish(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = itemUpdateSchema.parse(body);

    await prisma.items.update({
      where: { id },
      data: parsedBody as any,
    });

    return NextResponse.json({ message: 'Item updated successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('items_code_unique')) {
      return NextResponse.json({ error: 'Item code already exists' }, { status: 400 });
    }
    console.error(`PUT /api/library/items/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.items.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    // Handle foreign key constraint error (e.g. if item is used in transactions)
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete item because it is referenced in other records' }, { status: 400 });
    }
    console.error(`DELETE /api/library/items/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
