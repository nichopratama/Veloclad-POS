import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/rbac';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const putStoreSchema = z.object({
  store_name: z.string().optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional(),
  is_tax_active: z.boolean().optional(),
  receipt_footer: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const [store, tax, receipt] = await Promise.all([
      prisma.store_settings.findFirst(),
      prisma.tax_settings.findFirst(),
      prisma.receipt_settings.findFirst(),
    ]);

    return NextResponse.json({
      store_name: store?.name || 'My Store',
      address: store?.address || '',
      phone: store?.phone || '',
      email: store?.email || '',
      tax_rate: tax?.rate ? Number(tax.rate) : 0,
      is_tax_active: tax?.is_active ?? false,
      receipt_footer: receipt?.footer || '',
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/settings/store error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole('admin');

    const body = await req.json();
    const parsed = putStoreSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // 1. Upsert store_settings
      const existingStore = await tx.store_settings.findFirst();
      if (existingStore) {
        await tx.store_settings.update({
          where: { id: existingStore.id },
          data: {
            name: parsed.store_name !== undefined ? parsed.store_name : undefined,
            address: parsed.address !== undefined ? parsed.address : undefined,
            phone: parsed.phone !== undefined ? parsed.phone : undefined,
            email: parsed.email !== undefined ? parsed.email : undefined,
          },
        });
      } else if (parsed.store_name) {
        await tx.store_settings.create({
          data: {
            name: parsed.store_name,
            address: parsed.address || null,
            phone: parsed.phone || null,
            email: parsed.email || null,
          } satisfies Prisma.store_settingsUncheckedCreateInput,
        });
      }

      // 2. Upsert tax_settings
      const existingTax = await tx.tax_settings.findFirst();
      if (existingTax) {
        await tx.tax_settings.update({
          where: { id: existingTax.id },
          data: {
            rate: parsed.tax_rate !== undefined ? parsed.tax_rate : undefined,
            is_active: parsed.is_tax_active !== undefined ? parsed.is_tax_active : undefined,
          },
        });
      } else if (parsed.tax_rate !== undefined) {
        await tx.tax_settings.create({
          data: {
            name: 'Tax', // Required by schema
            rate: parsed.tax_rate,
            is_active: parsed.is_tax_active ?? false,
          } satisfies Prisma.tax_settingsUncheckedCreateInput,
        });
      }

      // 3. Upsert receipt_settings
      const existingReceipt = await tx.receipt_settings.findFirst();
      if (existingReceipt) {
        await tx.receipt_settings.update({
          where: { id: existingReceipt.id },
          data: {
            footer: parsed.receipt_footer !== undefined ? parsed.receipt_footer : undefined,
          },
        });
      } else if (parsed.receipt_footer !== undefined) {
        await tx.receipt_settings.create({
          data: {
            footer: parsed.receipt_footer,
          } satisfies Prisma.receipt_settingsUncheckedCreateInput,
        });
      }
    });

    return NextResponse.json({ message: 'Store settings updated successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.issues }, { status: 400 });
    }
    console.error('PUT /api/settings/store error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
