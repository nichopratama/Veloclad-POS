import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const getQuerySchema = z.object({
  search: z.string().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const query = getQuerySchema.parse(Object.fromEntries(url.searchParams));

    let whereClause = {};
    if (query.search) {
      whereClause = {
        name: { contains: query.search, mode: 'insensitive' },
      };
    }

    const data = await prisma.categories.findMany({
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
    console.error('GET /api/library/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const parsedBody = categorySchema.parse(body);

    const newCategory = await prisma.categories.create({
      data: parsedBody as any,
    });

    return NextResponse.json({
      message: 'Category created successfully',
      id: newCategory.id,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/library/categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
