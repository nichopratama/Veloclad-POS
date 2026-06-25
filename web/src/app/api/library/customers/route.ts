import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const getQuerySchema = z.object({
  search: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal('')),
  address: z.string().nullish(),
  points: z.number().int().default(0).optional(),
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
          { phone: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const data = await prisma.customers.findMany({
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
    console.error('GET /api/library/customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // create/update is allowed for 'login' role (kasir can create customers)
    await requireAuth();

    const body = await req.json();
    const parsedBody = customerSchema.parse(body);

    // Convert empty string email to null for DB consistency
    if (parsedBody.email === '') parsedBody.email = null;

    const newCustomer = await prisma.customers.create({
      data: parsedBody as any,
    });

    return NextResponse.json({
      message: 'Customer created successfully',
      id: newCustomer.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/library/customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
