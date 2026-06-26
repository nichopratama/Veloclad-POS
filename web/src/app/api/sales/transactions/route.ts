import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError, ApiError } from '@/lib/api';

const D = Prisma.Decimal;

// ---------- GET: daftar transaksi + filter + ringkasan + paginasi ----------
const listQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['success', 'cancelled', 'void']).optional(),
  cashier: z.coerce.number().int().optional(),        // user_id (staff) — filter kasir (Pass#2)
  paymentMethod: z.coerce.number().int().optional(),  // payment_type_id — filter metode bayar (Pass#2)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const q = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.transactionsWhereInput = {};
    if (q.status) where.status = q.status === 'success' ? 'completed' : q.status;
    if (q.cashier) where.user_id = q.cashier;
    if (q.paymentMethod) where.payment_type_id = q.paymentMethod;
    if (q.search) where.id = { contains: q.search, mode: 'insensitive' };
    if (q.startDate || q.endDate) {
      where.created_at = {};
      if (q.startDate) where.created_at.gte = new Date(q.startDate);
      if (q.endDate) where.created_at.lte = new Date(`${q.endDate}T23:59:59.999`);
    }

    const skip = (q.page - 1) * q.limit;

    const [total, rows, agg] = await Promise.all([
      prisma.transactions.count({ where }),
      prisma.transactions.findMany({
        where,
        include: {
          users: { select: { name: true } },
          payment_types: { select: { name: true } },
          transaction_items: { include: { items: { select: { name: true } } } },
          void_items: { include: { items: { select: { name: true } }, users: { select: { name: true } } } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: q.limit,
      }),
      prisma.transactions.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { total: true, net_sales: true },
      }),
    ]);

    const data = rows.map((t) => ({
      ...t,
      cashier_name: t.users?.name ?? t.cashier_name ?? 'System',
      payment_method: t.payment_types?.name ?? null,
      items_summary: t.transaction_items.map((ti) => ti.items?.name ?? 'Unknown Item').join(', '),
      items_detail: t.transaction_items,
      voided_items: t.void_items,
    }));

    return NextResponse.json({
      summary: {
        total_transactions: total,
        total_collected: Number(agg._sum.total ?? 0),
        net_sales: Number(agg._sum.net_sales ?? 0),
      },
      data,
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/sales/transactions');
  }
}

// ---------- POST: buat transaksi (uang + stok, KRITIKAL) ----------
const createSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int(),
        // CATATAN: `price` TIDAK diterima dari klien (anti price-tampering) —
        // harga selalu di-lookup otoritatif dari DB by id di server.
        qty: z.number().int().positive(),
        discount: z.number().nonnegative().default(0),
      }),
    )
    .min(1),
  payment_type_id: z.number().int(),
  payment_amount: z.number().nonnegative(),
  customer_id: z.number().int().nullish(),
  idempotencyKey: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const input = createSchema.parse(await req.json());
    const idemKey = input.idempotencyKey ?? req.headers.get('idempotency-key') ?? null;

    // Idempotency: replay aman bila key sudah pernah dipakai (D18).
    if (idemKey) {
      const existing = await prisma.transactions.findUnique({ where: { idempotency_key: idemKey } });
      if (existing) {
        return NextResponse.json({ message: 'Transaction already processed', transaction_id: existing.id, idempotent: true });
      }
    }

    // Pajak (hormati is_inclusive — FR-SET-03).
    const tax = await prisma.tax_settings.findFirst();
    const taxRate = tax?.is_active ? new D(tax.rate).div(100) : new D(0);
    const isInclusive = tax?.is_inclusive ?? false;

    // Harga OTORITATIF dari DB — JANGAN percaya harga klien (anti price-tampering).
    const itemIds = [...new Set(input.items.map((it) => it.id))];
    const dbItems = await prisma.items.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, price: true, is_active: true },
    });
    const itemById = new Map(dbItems.map((r) => [r.id, r]));

    // Hitung uang dengan Decimal (hindari error pembulatan float) memakai harga DB.
    // `lines` membawa harga+diskon otoritatif untuk dipakai ulang saat tulis transaction_items.
    let subtotal = new D(0);
    let discountTotal = new D(0);
    const lines = input.items.map((it) => {
      const row = itemById.get(it.id);
      if (!row) throw new ApiError(400, `Item ${it.id} tidak ditemukan`);
      if (row.is_active === false) throw new ApiError(400, `Item ${it.id} tidak aktif`);

      const unitPrice = new D(row.price);
      const lineGross = unitPrice.times(it.qty);
      const lineDiscount = new D(it.discount);
      // Clamp diskon ≤ subtotal baris (cegah total negatif via diskon dibuat-buat).
      if (lineDiscount.greaterThan(lineGross)) {
        throw new ApiError(400, `Diskon item ${it.id} melebihi subtotal baris`);
      }

      subtotal = subtotal.plus(lineGross);
      discountTotal = discountTotal.plus(lineDiscount);
      return { id: it.id, qty: it.qty, price: unitPrice, discount: lineDiscount, lineGross };
    });

    const taxable = subtotal.minus(discountTotal);
    let taxAmount: Prisma.Decimal;
    let total: Prisma.Decimal;
    if (isInclusive) {
      total = taxable;
      taxAmount = taxable.minus(taxable.div(new D(1).plus(taxRate)));
    } else {
      taxAmount = taxable.times(taxRate);
      total = taxable.plus(taxAmount);
    }

    const paymentAmount = new D(input.payment_amount);
    if (paymentAmount.lessThan(total)) {
      throw new ApiError(400, 'Jumlah pembayaran kurang dari total');
    }
    const change = paymentAmount.minus(total);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transactionId = `INV-${dateStr}-${randomBytes(2).toString('hex').toUpperCase()}`;

    const created = await prisma.$transaction(async (tx) => {
      await tx.transactions.create({
        data: {
          id: transactionId,
          user_id: session.user.staffId ?? null,
          customer_id: input.customer_id ?? null,
          payment_type_id: input.payment_type_id,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountTotal,
          total,
          net_sales: total,
          payment_amount: paymentAmount,
          change_amount: change,
          status: 'completed',
          idempotency_key: idemKey,
        } satisfies Prisma.transactionsUncheckedCreateInput,
      });

      for (const line of lines) {
        // Anti-oversell race-safe: decrement HANYA jika stock >= qty (atomic).
        const upd = await tx.items.updateMany({
          where: { id: line.id, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty } },
        });
        if (upd.count === 0) {
          throw new ApiError(400, `Stok tidak cukup atau item ${line.id} tidak ditemukan`);
        }

        await tx.transaction_items.create({
          data: {
            transaction_id: transactionId,
            item_id: line.id,
            price: line.price,
            qty: line.qty,
            subtotal: line.lineGross,
            discount: line.discount,
          } satisfies Prisma.transaction_itemsUncheckedCreateInput,
        });
      }

      return transactionId;
    });

    return NextResponse.json(
      {
        message: 'Transaction successful',
        transaction_id: created,
        receipt: {
          subtotal: subtotal.toFixed(2),
          discount_amount: discountTotal.toFixed(2),
          tax_amount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          payment_amount: paymentAmount.toFixed(2),
          change_amount: change.toFixed(2),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/sales/transactions');
  }
}

