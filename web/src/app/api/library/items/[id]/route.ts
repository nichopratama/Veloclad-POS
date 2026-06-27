import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';
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
    await requireRole('admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = itemUpdateSchema.parse(body);

    await prisma.items.update({
      where: { id },
      data: parsedBody satisfies Prisma.itemsUncheckedUpdateInput,
    });

    return NextResponse.json({ message: 'Item updated successfully' });
  } catch (error) {
    return handleApiError(error, 'PUT /api/library/items/[id]');
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

    await prisma.items.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/library/items/[id]');
  }
}
