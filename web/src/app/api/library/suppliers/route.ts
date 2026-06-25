import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const getQuerySchema = z.object({
  search: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal('')),
  address: z.string().nullish(),
  npwp: z.string().nullish(),
  is_active: z.boolean().default(true).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const query = getQuerySchema.parse(Object.fromEntries(url.searchParams));

    let whereClause = {};
    if (query.search) {
      whereClause = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { contact: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const data = await prisma.suppliers.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('GET /api/library/suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('owner', 'admin');

    const body = await req.json();
    const parsedBody = supplierSchema.parse(body);

    if (parsedBody.email === '') parsedBody.email = null;

    const newSupplier = await prisma.suppliers.create({
      data: parsedBody as any,
    });

    return NextResponse.json({
      message: 'Supplier created successfully',
      id: newSupplier.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/library/suppliers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
