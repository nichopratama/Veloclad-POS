import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT id, name, code, stock, min_stock, image_url
      FROM items
      WHERE is_active = true 
        AND stock <= min_stock
      ORDER BY stock ASC
    `;

    // Convert decimal to number for json if needed, but Prisma queryRaw usually returns stock as number or BigInt/Decimal depending on type.
    const items = lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      stock: Number(item.stock),
      min_stock: Number(item.min_stock),
      image_url: item.image_url
    }));

    return NextResponse.json({ data: items, total: items.length });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/dashboard/low-stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
