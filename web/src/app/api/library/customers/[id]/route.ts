import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';

const customerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal('')),
  address: z.string().nullish(),
  points: z.number().int().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    // update is allowed for 'login' role
    await requireAuth();

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsedBody = customerUpdateSchema.parse(body);
    
    // Convert empty string email to null
    if (parsedBody.email === '') parsedBody.email = null;

    await prisma.customers.update({
      where: { id },
      data: parsedBody as any,
    });

    return NextResponse.json({ message: 'Customer updated successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    console.error(`PUT /api/library/customers/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    // delete is restricted to owner/admin
    await requireRole('owner', 'admin');

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.customers.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'Cannot delete customer because it is referenced in transactions' }, { status: 400 });
    }
    console.error(`DELETE /api/library/customers/[id] error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
